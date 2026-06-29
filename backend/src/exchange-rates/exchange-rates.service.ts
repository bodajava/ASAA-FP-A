import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { MarketRateDto, MarketWidgetDto } from './dto/market-widget.dto';
import { SyncAllRatesResultDto } from './dto/sync-all-rates.dto';
import {
  ScenarioType,
  RateSource,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';

interface LiveRateResult {
  rates: Record<string, number>;
  provider: string;
}

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);
  private static readonly WIDGET_CURRENCIES = [
    'USD',
    'EUR',
    'SAR',
    'GBP',
  ] as const;
  private static readonly BASE_CURRENCY = 'EGP';

  constructor(
    private prisma: PrismaService,
    private readonly tenantService: TenantService,
  ) {}

  // ---------------------------------------------------------------------------
  // FastForex — always fetch FROM each currency TO EGP
  // Each call: GET /fetch-multi?from=USD&to=EGP  →  results.EGP = 49.123
  // We make one call per "from" currency in parallel.
  // ---------------------------------------------------------------------------
  private async fetchFromFastForex(
    fromCurrencies: readonly string[],
    toCurrency: string,
  ): Promise<LiveRateResult | null> {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      this.logger.debug('EXCHANGE_RATE_API_KEY not set, skipping FastForex');
      return null;
    }

    const rates: Record<string, number> = {};

    const results = await Promise.allSettled(
      fromCurrencies.map(async (from) => {
        const url = `https://api.fastforex.io/fetch-multi?from=${from}&to=${toCurrency}`;
        const response = await fetch(url, {
          headers: { 'X-API-Key': apiKey },
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
          this.logger.warn(
            `FastForex ${from}→${toCurrency} returned ${response.status}`,
          );
          return null;
        }
        const data = (await response.json()) as {
          results?: Record<string, number>;
        };
        if (data.results && data.results[toCurrency] !== undefined) {
          return { from, rate: data.results[toCurrency] };
        }
        this.logger.warn(
          `FastForex ${from}→${toCurrency} missing rate in response`,
        );
        return null;
      }),
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        rates[r.value.from] = r.value.rate;
      }
    }

    if (Object.keys(rates).length === 0) {
      this.logger.warn('FastForex returned no valid rates');
      return null;
    }

    return { rates, provider: 'fastforex' };
  }

  // ---------------------------------------------------------------------------
  // ExchangeRate-API provider (legacy)
  // ---------------------------------------------------------------------------
  private async fetchFromExchangeRateApi(
    baseCurrency: string,
  ): Promise<LiveRateResult | null> {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    const baseUrl =
      process.env.EXCHANGE_RATE_BASE_URL ??
      'https://v6.exchangerate-api.com/v6';

    if (!apiKey) {
      this.logger.debug(
        'EXCHANGE_RATE_API_KEY not set, skipping ExchangeRate-API',
      );
      return null;
    }

    try {
      const url = `${baseUrl}/${apiKey}/latest/${baseCurrency}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.warn(`ExchangeRate-API returned ${response.status}`);
        return null;
      }

      const data = (await response.json()) as {
        result?: string;
        rates?: Record<string, number>;
      };

      if (data.result === 'success' && data.rates) {
        return { rates: data.rates, provider: 'exchangerate-api' };
      }

      this.logger.warn('ExchangeRate-API returned unexpected structure');
      return null;
    } catch (err) {
      this.logger.warn(`ExchangeRate-API fetch failed: ${err}`);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Frankfurter (free fallback, no key)
  // ---------------------------------------------------------------------------
  private async fetchFromFrankfurter(
    baseCurrency: string,
  ): Promise<LiveRateResult | null> {
    try {
      const url = `https://api.frankfurter.dev/v1/latest?base=${baseCurrency}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.warn(`Frankfurter returned ${response.status}`);
        return null;
      }

      const data = (await response.json()) as {
        rates?: Record<string, number>;
      };

      if (data.rates) {
        return { rates: data.rates, provider: 'frankfurter' };
      }

      return null;
    } catch (err) {
      this.logger.warn(`Frankfurter fetch failed: ${err}`);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // DB cached fallback
  // ---------------------------------------------------------------------------
  private async getCachedFromDb(
    companyId: bigint,
    currencies: readonly string[],
  ): Promise<{ rates: Record<string, number>; lastUpdate: Date | null }> {
    const rows = await this.prisma.exchangeRate.findMany({
      where: {
        companyId,
        fromCurrency: { in: [...currencies] },
        toCurrency: ExchangeRatesService.BASE_CURRENCY,
      },
      orderBy: [{ rateDate: 'desc' }, { updatedAt: 'desc' }],
      select: {
        fromCurrency: true,
        rate: true,
        updatedAt: true,
        rateDate: true,
      },
    });

    const rates: Record<string, number> = {};
    let lastUpdate: Date | null = null;

    for (const row of rows) {
      if (rates[row.fromCurrency] === undefined) {
        rates[row.fromCurrency] = Number(row.rate);
      }
      if (!lastUpdate || (row.updatedAt && row.updatedAt > lastUpdate)) {
        lastUpdate = row.updatedAt;
      }
    }

    return { rates, lastUpdate };
  }

  // ---------------------------------------------------------------------------
  // Unified fetch: always returns rates keyed by FROM currency → EGP
  // e.g. { USD: 49.12, EUR: 53.8, SAR: 13.1, GBP: 62.5 }
  // ---------------------------------------------------------------------------
  private async fetchLiveRates(
    companyId: bigint,
  ): Promise<{ rates: Record<string, number>; provider: string }> {
    const provider = (
      process.env.EXCHANGE_RATE_PROVIDER ?? 'fastforex'
    ).toLowerCase();
    const fromCurrencies = ExchangeRatesService.WIDGET_CURRENCIES;
    const toCurrency = ExchangeRatesService.BASE_CURRENCY;

    // 1. Try configured provider
    if (provider === 'fastforex') {
      const result = await this.fetchFromFastForex(fromCurrencies, toCurrency);
      if (result) {
        this.validateRates(result.rates);
        return result;
      }
    } else if (provider === 'exchangerate-api') {
      const result = await this.fetchFromExchangeRateApi(toCurrency);
      if (result) {
        this.validateRates(result.rates);
        return result;
      }
    }

    // 2. Try alternative providers as fallback
    if (provider !== 'fastforex') {
      this.logger.log('Primary provider failed, trying FastForex');
      const ff = await this.fetchFromFastForex(fromCurrencies, toCurrency);
      if (ff) {
        this.validateRates(ff.rates);
        return ff;
      }
    }

    if (provider !== 'exchangerate-api') {
      this.logger.log('Trying ExchangeRate-API as fallback');
      const era = await this.fetchFromExchangeRateApi(toCurrency);
      if (era) {
        this.validateRates(era.rates);
        return era;
      }
    }

    this.logger.log('Trying Frankfurter as fallback');
    const frank = await this.fetchFromFrankfurter(toCurrency);
    if (frank) {
      this.validateRates(frank.rates);
      return frank;
    }

    // 3. DB cached (final fallback)
    this.logger.log('All live APIs failed, using cached DB rates');
    const cached = await this.getCachedFromDb(
      companyId,
      ExchangeRatesService.WIDGET_CURRENCIES,
    );
    return { rates: cached.rates, provider: 'cached' };
  }

  // Validate that USD→EGP rate is reasonable (must be > 1, otherwise inverted)
  private validateRates(rates: Record<string, number>): void {
    const usdRate = rates['USD'];
    if (usdRate !== undefined && usdRate < 1) {
      this.logger.warn(
        `USD→EGP rate is ${usdRate} (< 1), likely inverted. Provider returned wrong direction.`,
      );
    }
  }

  async syncUsdRate(companyId: bigint, userId: bigint) {
    const live = await this.fetchLiveRates(companyId);
    const rate = live.rates['USD'];

    if (rate === undefined || rate === 0 || rate < 1) {
      this.logger.error(
        `No valid USD/EGP rate available from provider: ${live.provider} (got ${rate})`,
      );
      return {
        rate: 0,
        oldRate: 0,
        rateDate: new Date(),
        scenarioCreated: false,
        scenarioId: null,
        error: 'No valid USD/EGP rate available',
        provider: live.provider,
      };
    }

    const latestDbRate = await this.prisma.exchangeRate.findFirst({
      where: { companyId, fromCurrency: 'USD', toCurrency: 'EGP' },
      orderBy: { rateDate: 'desc' },
    });
    const oldRateVal = latestDbRate ? Number(latestDbRate.rate) : 0;

    const source =
      live.provider === 'cached' ? RateSource.cached : RateSource.api;

    const todayStr = new Date().toISOString().split('T')[0];

    const rateRecord = await this.prisma.exchangeRate.upsert({
      where: {
        companyId_fromCurrency_toCurrency_rateDate: {
          companyId,
          fromCurrency: 'USD',
          toCurrency: 'EGP',
          rateDate: new Date(todayStr),
        },
      },
      update: {
        rate: rate,
        source: source,
        createdBy: userId,
        updatedAt: new Date(),
      },
      create: {
        companyId,
        fromCurrency: 'USD',
        toCurrency: 'EGP',
        rate: rate,
        rateDate: new Date(todayStr),
        source: source,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    let scenarioCreated = false;
    let scenarioIdStr = null;

    if (oldRateVal > 0 && rate > oldRateVal) {
      const cogsAndExpenses = await this.prisma.account.findMany({
        where: {
          companyId,
          type: { in: ['cogs', 'expense'] },
        },
        select: { id: true },
      });
      const accountIds = cogsAndExpenses.map((a) => a.id.toString());

      const pctChange = ((rate - oldRateVal) / oldRateVal) * 100;
      const scenarioName = `USD Rate Hike Simulation (USD/EGP: ${rate.toFixed(2)})`;

      const scenario = await this.prisma.scenario.create({
        data: {
          companyId,
          name: scenarioName,
          scenarioType: ScenarioType.custom,
          assumptionsJson: JSON.stringify({
            subtype: 'currency_rate_change',
            fromCurrency: 'USD',
            toCurrency: 'EGP',
            newRate: rate,
            targetAccountIds: accountIds,
            percentage: pctChange,
            notes: `Automatically generated scenario simulating a ${pctChange.toFixed(1)}% USD to EGP rate hike.`,
          }),
          createdBy: userId,
        },
      });

      scenarioIdStr = scenario.id.toString();
      scenarioCreated = true;

      await this.prisma.notification.create({
        data: {
          companyId,
          userId,
          title: `USD Rate Increase Alert — Scenario Triggered`,
          body: `The USD to EGP rate increased to ${rate.toFixed(2)} EGP (+${pctChange.toFixed(1)}%). A simulation scenario "${scenarioName}" has been automatically generated to model the impact on Expenses and COGS.`,
          channel: NotificationChannel.system,
          status: NotificationStatus.pending,
          entityType: 'Scenario',
          entityId: scenario.id,
        },
      });
    }

    return {
      rate: Number(rateRecord.rate),
      oldRate: oldRateVal,
      rateDate: rateRecord.rateDate,
      scenarioCreated,
      scenarioId: scenarioIdStr,
      provider: live.provider,
    };
  }

  async create(companyId: bigint, userId: bigint, dto: CreateExchangeRateDto) {
    return this.prisma.exchangeRate.upsert({
      where: {
        companyId_fromCurrency_toCurrency_rateDate: {
          companyId,
          fromCurrency: dto.fromCurrency.toUpperCase(),
          toCurrency: dto.toCurrency.toUpperCase(),
          rateDate: new Date(dto.rateDate),
        },
      },
      update: {
        rate: dto.rate,
        source: dto.source ?? 'manual',
        createdBy: userId,
        updatedAt: new Date(),
      },
      create: {
        companyId,
        fromCurrency: dto.fromCurrency.toUpperCase(),
        toCurrency: dto.toCurrency.toUpperCase(),
        rate: dto.rate,
        rateDate: new Date(dto.rateDate),
        source: dto.source ?? 'manual',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findAll(companyId: bigint, from?: string, to?: string, limit = 50) {
    const where: Record<string, unknown> = { companyId };
    if (from) where.fromCurrency = from.toUpperCase();
    if (to) where.toCurrency = to.toUpperCase();

    const rows = await this.prisma.exchangeRate.findMany({
      where,
      orderBy: [{ rateDate: 'desc' }, { fromCurrency: 'asc' }],
      take: limit,
      select: {
        id: true,
        fromCurrency: true,
        toCurrency: true,
        rate: true,
        rateDate: true,
        source: true,
        createdAt: true,
        creator: { select: { id: true, name: true } },
      },
    });

    return rows.map((r) => ({
      ...r,
      id: r.id.toString(),
      rate: Number(r.rate),
      creator: r.creator
        ? { id: r.creator.id.toString(), name: r.creator.name }
        : null,
    }));
  }

  async getLatestRates(companyId: bigint) {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT er.*
      FROM exchange_rates er
      INNER JOIN (
        SELECT from_currency, to_currency, MAX(rate_date) AS max_date
        FROM exchange_rates
        WHERE company_id = ${companyId}
        GROUP BY from_currency, to_currency
      ) latest
      ON er.from_currency = latest.from_currency
      AND er.to_currency = latest.to_currency
      AND er.rate_date = latest.max_date
      AND er.company_id = ${companyId}
      ORDER BY er.from_currency, er.to_currency
    `;

    return rows.map((r) => ({
      id: (r.id as bigint).toString(),
      fromCurrency: r.from_currency,
      toCurrency: r.to_currency,
      rate: Number(r.rate),
      rateDate: r.rate_date,
      source: r.source,
    }));
  }

  async getRate(
    companyId: bigint,
    from: string,
    to: string,
    date?: Date,
  ): Promise<number> {
    if (from === to) return 1;
    const targetDate = date ?? new Date();
    const row = await this.prisma.exchangeRate.findFirst({
      where: {
        companyId,
        fromCurrency: from.toUpperCase(),
        toCurrency: to.toUpperCase(),
        rateDate: { lte: targetDate },
      },
      orderBy: { rateDate: 'desc' },
      select: { rate: true },
    });
    return row ? Number(row.rate) : 1;
  }

  async syncAllRates(
    companyId: bigint,
    userId: bigint,
  ): Promise<SyncAllRatesResultDto> {
    const currencies = ExchangeRatesService.WIDGET_CURRENCIES;
    const live = await this.fetchLiveRates(companyId);

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    const source: RateSource =
      live.provider === 'cached' ? RateSource.cached : RateSource.api;

    const upsertPromises: Promise<unknown>[] = [];

    for (const currency of currencies) {
      const rateValue = live.rates[currency];
      if (rateValue === undefined || rateValue === 0) continue;

      upsertPromises.push(
        this.prisma.exchangeRate.upsert({
          where: {
            companyId_fromCurrency_toCurrency_rateDate: {
              companyId,
              fromCurrency: currency,
              toCurrency: ExchangeRatesService.BASE_CURRENCY,
              rateDate: today,
            },
          },
          update: {
            rate: rateValue,
            source: source,
            createdBy: userId,
            updatedAt: new Date(),
          },
          create: {
            companyId,
            fromCurrency: currency,
            toCurrency: ExchangeRatesService.BASE_CURRENCY,
            rate: rateValue,
            rateDate: today,
            source: source,
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }),
      );
    }

    await Promise.all(upsertPromises);

    return {
      updatedCount: upsertPromises.length,
      currencies: [...currencies],
      syncedAt: new Date().toISOString(),
    };
  }

  async getMarketWidget(companyId: bigint): Promise<MarketWidgetDto> {
    const currencies = ExchangeRatesService.WIDGET_CURRENCIES;

    const live = await this.fetchLiveRates(companyId);
    const isLive = live.provider !== 'cached';

    const yesterdayStr = this.getYesterdayStr();
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    const yesterday = new Date(yesterdayStr);

    const todayRates = await this.prisma.exchangeRate.findMany({
      where: {
        companyId,
        fromCurrency: { in: [...currencies] },
        toCurrency: ExchangeRatesService.BASE_CURRENCY,
        rateDate: today,
      },
      select: {
        fromCurrency: true,
        rate: true,
        source: true,
        updatedAt: true,
      },
    });

    const yesterdayRates = await this.prisma.exchangeRate.findMany({
      where: {
        companyId,
        fromCurrency: { in: [...currencies] },
        toCurrency: ExchangeRatesService.BASE_CURRENCY,
        rateDate: yesterday,
      },
      select: { fromCurrency: true, rate: true },
    });

    const yesterdayMap = new Map<string, number>();
    for (const row of yesterdayRates) {
      yesterdayMap.set(row.fromCurrency, Number(row.rate));
    }

    const latestUpdatedAt = todayRates.reduce<Date | null>((latest, row) => {
      if (!row.updatedAt) return latest;
      if (!latest || row.updatedAt > latest) return row.updatedAt;
      return latest;
    }, null);

    const marketRates: MarketRateDto[] = [];

    for (const currency of currencies) {
      let currentRate: number;
      let source: string;

      if (
        isLive &&
        live.rates[currency] !== undefined &&
        live.rates[currency] > 0
      ) {
        currentRate = live.rates[currency];
        source = live.provider;
      } else {
        const dbRate = todayRates.find((r) => r.fromCurrency === currency);
        if (dbRate) {
          currentRate = Number(dbRate.rate);
          source = dbRate.source ?? 'cached';
        } else {
          currentRate = 0;
          source = 'unavailable';
        }
      }

      const previousRate = yesterdayMap.get(currency) ?? currentRate;
      const change = this.roundTo(currentRate - previousRate, 6);
      const changePct =
        previousRate !== 0 ? this.roundTo((change / previousRate) * 100, 4) : 0;

      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      if (change > 0) trend = 'up';
      else if (change < 0) trend = 'down';

      const stale = currentRate === 0;
      const staleReason =
        currentRate === 0
          ? 'No exchange rate available'
          : !isLive
            ? 'Live APIs unavailable; showing cached rates'
            : undefined;

      marketRates.push({
        currency,
        rate: currentRate,
        previousRate,
        change,
        changePct,
        trend,
        lastUpdate: latestUpdatedAt?.toISOString() ?? new Date().toISOString(),
        source,
        provider: live.provider,
        stale,
        staleReason,
      });
    }

    return {
      rates: marketRates,
      lastSyncAt: latestUpdatedAt?.toISOString() ?? null,
      baseCurrency: ExchangeRatesService.BASE_CURRENCY,
      provider: live.provider,
    };
  }

  async remove(
    companyId: bigint,
    id: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const existing = await this.prisma.exchangeRate.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Exchange rate not found');

    await this.prisma.exchangeRate.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ExchangeRate',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(existing),
      },
    });

    return existing;
  }

  private getYesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  private roundTo(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}
