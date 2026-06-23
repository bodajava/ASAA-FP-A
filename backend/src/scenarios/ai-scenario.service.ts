import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { PrismaService } from '../prisma.service';
import { Account } from '@prisma/client';
import { ErrorCodes } from '../common/error-codes';
import {
  AiScenarioResponseDto,
  AiScenarioSuggestionDto,
  AiUnavailableDto,
} from './dto/ai-scenario.dto';

/**
 * Normalize a value to a number with a fallback default.
 * Handles strings, numbers, and undefined/null.
 */
function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fallback model list in priority order.
 * If the primary model fails with 503/429/timeout, try the next one.
 */
const FALLBACK_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

/**
 * HTTP status codes that indicate the provider is overloaded.
 */
const OVERLOADED_STATUS_CODES = [503, 429];

/**
 * Maximum retry attempts per model before falling back to the next model.
 */
const MAX_RETRIES_PER_MODEL = 2;

/**
 * Timeout for a single Gemini API call in milliseconds.
 */
const GEMINI_TIMEOUT_MS = 30_000;

/**
 * Company-level aggregated summary sent to Gemini.
 * SECURITY: Contains ONLY anonymized, aggregated financial metrics.
 * NEVER includes: raw transactions, customer PII, supplier contacts,
 * employee data, DB credentials, Oracle connections, JWT secrets, or API keys.
 */
interface CompanyFinancialSummary {
  fiscalYear: number;
  currencyCode: string;
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  grossMarginPercent: number;
  budgetUtilization: number;
  forecastAccuracy: number;
  monthlyRevenueTrend: Array<{
    month: number;
    revenue: number;
    expenses: number;
  }>;
  topProducts: Array<{
    rank: number;
    name: string;
    totalRevenue: number;
  }>;
  topCustomers: Array<{
    rank: number;
    anonymizedName: string;
    totalRevenue: number;
  }>;
  rawMaterialPriceChanges: Array<{
    materialName: string;
    changePercent: number;
  }>;
  exchangeRateChanges: Array<{
    currencyPair: string;
    changePercent: number;
  }>;
  inventoryRiskSummary: {
    totalItems: number;
    lowStockItems: number;
    overstockItems: number;
  };
  productionSummary: {
    totalPlannedQty: number;
    activeProductCount: number;
    activeSiteCount: number;
  };
}

/**
 * Deterministic local fallback scenario data.
 * Used when ALL Gemini models fail (503, 429, timeout).
 */
const LOCAL_FALLBACK_SCENARIOS: {
  en: AiScenarioSuggestionDto[];
  ar: AiScenarioSuggestionDto[];
} = {
  en: [
    {
      title: 'Raw Material Price Surge Impact',
      type: 'raw_material_price_increase',
      confidence: 70,
      summary: 'A hypothetical 15% increase in raw material prices based on recent market trends. This scenario models the impact on gross margin and suggests mitigation strategies.',
      assumptions: [
        { key: 'rawMaterialPriceChangePercent', value: 15, unit: 'percent', description: 'Expected raw material price increase' },
      ],
      expectedImpact: {
        revenueImpactPercent: 0,
        costImpactPercent: 12.5,
        grossMarginImpactPercent: -8.2,
        netProfitImpactPercent: -10.5,
        cashFlowImpactPercent: -6.3,
      },
      recommendedActions: [
        'Lock in supplier contracts at current prices for 6-12 months',
        'Negotiate volume discounts with alternative suppliers',
        'Review product pricing to pass through part of the increase',
      ],
      simulationInputs: {
        rawMaterialPriceChangePercent: 15,
        currencyChangePercent: 0,
        demandChangePercent: 0,
        branchExpansionCount: 0,
      },
    },
    {
      title: 'Currency Fluctuation Scenario',
      type: 'currency_change',
      confidence: 65,
      summary: 'A 10% adverse currency movement scenario. This models the impact on import costs and suggests hedging strategies to protect margins.',
      assumptions: [
        { key: 'currencyChangePercent', value: -10, unit: 'percent', description: 'Adverse exchange rate movement' },
      ],
      expectedImpact: {
        revenueImpactPercent: -2.0,
        costImpactPercent: 8.0,
        grossMarginImpactPercent: -5.5,
        netProfitImpactPercent: -7.0,
        cashFlowImpactPercent: -4.5,
      },
      recommendedActions: [
        'Consider forward currency contracts for major purchases',
        'Review pricing of imported materials',
        'Explore local sourcing alternatives',
      ],
      simulationInputs: {
        rawMaterialPriceChangePercent: 0,
        currencyChangePercent: -10,
        demandChangePercent: 0,
        branchExpansionCount: 0,
      },
    },
    {
      title: 'Demand Contraction Planning',
      type: 'demand_decrease',
      confidence: 60,
      summary: 'A conservative scenario modeling a 10% reduction in customer demand. This helps assess fixed cost coverage and identifies areas for cost optimization.',
      assumptions: [
        { key: 'demandChangePercent', value: -10, unit: 'percent', description: 'Expected demand decrease' },
      ],
      expectedImpact: {
        revenueImpactPercent: -10.0,
        costImpactPercent: -3.0,
        grossMarginImpactPercent: -6.8,
        netProfitImpactPercent: -15.0,
        cashFlowImpactPercent: -12.0,
      },
      recommendedActions: [
        'Review fixed cost structure for potential reductions',
        'Focus on high-margin product lines',
        'Strengthen customer retention programs',
      ],
      simulationInputs: {
        rawMaterialPriceChangePercent: 0,
        currencyChangePercent: 0,
        demandChangePercent: -10,
        branchExpansionCount: 0,
      },
    },
  ],
  ar: [
    {
      title: 'تأثير ارتفاع أسعار المواد الخام',
      type: 'raw_material_price_increase',
      confidence: 70,
      summary: 'سيناريو افتراضي لارتفاع أسعار المواد الخام بنسبة 15% بناءً على اتجاهات السوق الحالية. يsimulate هذا السيناريو التأثير على هامش الربح واقترح استراتيجيات التخفيف.',
      assumptions: [
        { key: 'rawMaterialPriceChangePercent', value: 15, unit: 'percent', description: 'ارتفاع متوقع في أسعار المواد الخام' },
      ],
      expectedImpact: {
        revenueImpactPercent: 0,
        costImpactPercent: 12.5,
        grossMarginImpactPercent: -8.2,
        netProfitImpactPercent: -10.5,
        cashFlowImpactPercent: -6.3,
      },
      recommendedActions: [
        'توقيع عقود مع الموردين بالأسعار الحالية لمدة 6-12 شهراً',
        'التفاوض على خصومات الكمية مع موردين بديلين',
        'مراجعة أسعار المنتجات لإعادة جزء من الزيادة',
      ],
      simulationInputs: {
        rawMaterialPriceChangePercent: 15,
        currencyChangePercent: 0,
        demandChangePercent: 0,
        branchExpansionCount: 0,
      },
    },
    {
      title: 'سيناريو تقلبات العملة',
      type: 'currency_change',
      confidence: 65,
      summary: 'سيناريو حركة عملة عكسية بنسبة 10%. يsimulate هذا التأثير على تكاليف الاستيراد واقترح استراتيجيات التحوط لحماية الهوامش.',
      assumptions: [
        { key: 'currencyChangePercent', value: -10, unit: 'percent', description: 'حركة سعر صرف عكسية' },
      ],
      expectedImpact: {
        revenueImpactPercent: -2.0,
        costImpactPercent: 8.0,
        grossMarginImpactPercent: -5.5,
        netProfitImpactPercent: -7.0,
        cashFlowImpactPercent: -4.5,
      },
      recommendedActions: [
        'التقاط عقود صرف أمامية للمشتريات الرئيسية',
        'مراجعة أسعار المواد المستوردة',
        'استكشاف بدائل التوريد المحلي',
      ],
      simulationInputs: {
        rawMaterialPriceChangePercent: 0,
        currencyChangePercent: -10,
        demandChangePercent: 0,
        branchExpansionCount: 0,
      },
    },
    {
      title: 'تخطيط انكماش الطلب',
      type: 'demand_decrease',
      confidence: 60,
      summary: 'سيناريو تحفظي يsimulate انخفاض الطلب من العملاء بنسبة 10%. يساعد في تقييم تغطية التكاليف الثابتة وتحديد مجالات تحسين التكاليف.',
      assumptions: [
        { key: 'demandChangePercent', value: -10, unit: 'percent', description: 'انخفاض متوقع في الطلب' },
      ],
      expectedImpact: {
        revenueImpactPercent: -10.0,
        costImpactPercent: -3.0,
        grossMarginImpactPercent: -6.8,
        netProfitImpactPercent: -15.0,
        cashFlowImpactPercent: -12.0,
      },
      recommendedActions: [
        'مراجعة هيكل التكاليف الثابتة للتخفيض المحتمل',
        'التركيز على خطوط المنتجات ذات الهامش المرتفع',
        ' تعزيز برامج الاحتفاظ بالعملاء',
      ],
      simulationInputs: {
        rawMaterialPriceChangePercent: 0,
        currencyChangePercent: 0,
        demandChangePercent: -10,
        branchExpansionCount: 0,
      },
    },
  ],
};

@Injectable()
export class AiScenarioService {
  private readonly logger = new Logger(AiScenarioService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if Gemini API key is configured.
   */
  isAiAvailable(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  /**
   * Return an unavailability message when GEMINI_API_KEY is missing.
   */
  getUnavailableResponse(): AiUnavailableDto {
    return {
      message: 'AI suggestions unavailable. Please configure GEMINI_API_KEY.',
      available: false,
      code: ErrorCodes.AI_UNAVAILABLE,
    };
  }

  /**
   * Check if an error indicates the provider is overloaded (503, 429, or timeout).
   */
  private isOverloadedError(error: unknown): boolean {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('timeout') || msg.includes('timed out')) {
        return true;
      }
    }
    if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      if ('status' in errObj && typeof errObj.status === 'number') {
        return OVERLOADED_STATUS_CODES.includes(errObj.status);
      }
      if ('statusCode' in errObj && typeof errObj.statusCode === 'number') {
        return OVERLOADED_STATUS_CODES.includes(errObj.statusCode);
      }
      if ('message' in errObj && typeof errObj.message === 'string') {
        const msg = errObj.message.toLowerCase();
        if (msg.includes('503') || msg.includes('429') || msg.includes('overloaded') || msg.includes('rate limit')) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Build a safe, aggregated company summary for the AI prompt.
   * SECURITY: Only anonymized, aggregated data is included.
   * No raw rows, no PII, no credentials.
   */
  private async buildCompanySummary(
    companyId: bigint,
  ): Promise<CompanyFinancialSummary> {
    const currentYear = new Date().getFullYear();

    // Fetch accounts for type classification
    const accounts: Account[] = await this.prisma.account.findMany({
      where: { companyId },
    });
    const revenueAccounts = accounts.filter((a: Account) => a.type === 'revenue');
    const expenseAccounts = accounts.filter((a: Account) => a.type === 'expense');
    const revenueAccountIds = revenueAccounts.map((a: Account) => a.id);
    const expenseAccountIds = expenseAccounts.map((a: Account) => a.id);

    // Fetch actual lines for current fiscal year
    const actualLines = await this.prisma.actualLine.findMany({
      where: {
        actualImport: { companyId },
        transactionDate: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1),
        },
      },
    });

    // Aggregate revenue and expenses
    let totalRevenue = 0;
    let totalExpenses = 0;
    const monthlyRevenue = new Map<number, number>();
    const monthlyExpenses = new Map<number, number>();

    for (const line of actualLines) {
      const amount = Number(line.amount);
      const month = line.transactionDate.getMonth() + 1;

      if (revenueAccountIds.includes(line.accountId)) {
        totalRevenue += amount;
        monthlyRevenue.set(month, (monthlyRevenue.get(month) ?? 0) + amount);
      }
      if (expenseAccountIds.includes(line.accountId)) {
        totalExpenses += amount;
        monthlyExpenses.set(month, (monthlyExpenses.get(month) ?? 0) + amount);
      }
    }

    const grossProfit = totalRevenue - totalExpenses;
    const grossMarginPercent =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Net profit (simplified: revenue - all expenses)
    const netProfit = grossProfit;

    // Build monthly revenue trend (12 months)
    const monthlyRevenueTrend: CompanyFinancialSummary['monthlyRevenueTrend'] =
      [];
    for (let m = 1; m <= 12; m++) {
      monthlyRevenueTrend.push({
        month: m,
        revenue: monthlyRevenue.get(m) ?? 0,
        expenses: monthlyExpenses.get(m) ?? 0,
      });
    }

    // Budget utilization
    const budgetCycles = await this.prisma.budgetCycle.findMany({
      where: { companyId, fiscalYear: currentYear },
      include: { budgetLines: true },
    });
    let totalBudgeted = 0;
    for (const cycle of budgetCycles) {
      for (const line of cycle.budgetLines) {
        totalBudgeted += Number(line.amount);
      }
    }
    const budgetUtilization =
      totalBudgeted > 0 ? (totalRevenue / totalBudgeted) * 100 : 0;

    // Forecast accuracy (average from logs)
    const accuracyLogs = await this.prisma.forecastAccuracyLog.findMany({
      where: { companyId, fiscalYear: currentYear },
    });
    const forecastAccuracy =
      accuracyLogs.length > 0
        ? accuracyLogs.reduce(
            (sum: number, log: { variancePct: { toString(): string } }) =>
              sum + Number(log.variancePct),
            0,
          ) / accuracyLogs.length
        : 0;

    // Top products by revenue (anonymized - only name and revenue)
    const productRevenueMap = new Map<bigint, { name: string; total: number }>();
    for (const line of actualLines) {
      if (line.productId && revenueAccountIds.includes(line.accountId)) {
        const existing = productRevenueMap.get(line.productId);
        if (existing) {
          existing.total += Number(line.amount);
        } else {
          const product = await this.prisma.product.findUnique({
            where: { id: line.productId },
          });
          productRevenueMap.set(line.productId, {
            name: product?.name ?? 'Unknown',
            total: Number(line.amount),
          });
        }
      }
    }
    const topProducts = Array.from(productRevenueMap.values())
      .sort((a: { total: number }, b: { total: number }) => b.total - a.total)
      .slice(0, 5)
      .map((p: { name: string; total: number }, i: number) => ({
        rank: i + 1,
        name: p.name,
        totalRevenue: Math.round(p.total * 100) / 100,
      }));

    // Top customers by revenue (anonymized as Customer 1, Customer 2, etc.)
    const customerRevenueMap = new Map<bigint, { name: string; total: number }>();
    for (const line of actualLines) {
      if (line.customerId && revenueAccountIds.includes(line.accountId)) {
        const existing = customerRevenueMap.get(line.customerId);
        if (existing) {
          existing.total += Number(line.amount);
        } else {
          const customer = await this.prisma.customer.findUnique({
            where: { id: line.customerId },
          });
          // SECURITY: Only use the name for aggregation, not PII
          customerRevenueMap.set(line.customerId, {
            name: customer?.name ?? 'Unknown',
            total: Number(line.amount),
          });
        }
      }
    }
    const topCustomers = Array.from(customerRevenueMap.values())
      .sort((a: { total: number }, b: { total: number }) => b.total - a.total)
      .slice(0, 5)
      .map((c: { name: string; total: number }, i: number) => ({
        rank: i + 1,
        anonymizedName: `Customer ${i + 1}`,
        totalRevenue: Math.round(c.total * 100) / 100,
      }));

    // Raw material price changes (percentage only, no private details)
    const rawMaterials = await this.prisma.rawMaterialPrice.findMany({
      where: { companyId },
      orderBy: { priceDate: 'desc' },
      include: { material: true },
    });
    const materialLatestPrices = new Map<
      bigint,
      { name: string; latest: number; previous: number }
    >();
    for (const rmp of rawMaterials) {
      const matId = rmp.materialId;
      const existing = materialLatestPrices.get(matId);
      if (!existing) {
        materialLatestPrices.set(matId, {
          name: rmp.material.name,
          latest: Number(rmp.price),
          previous: Number(rmp.price),
        });
      } else if (Number(rmp.price) !== existing.latest) {
        existing.previous = Number(rmp.price);
      }
    }
    const rawMaterialPriceChanges = Array.from(
      materialLatestPrices.values(),
    ).map((m: { name: string; latest: number; previous: number }) => ({
      materialName: m.name,
      changePercent:
        m.previous > 0
          ? Math.round(((m.latest - m.previous) / m.previous) * 10000) / 100
          : 0,
    }));

    // Exchange rate changes (percentage only)
    const exchangeRates = await this.prisma.exchangeRate.findMany({
      where: { companyId },
      orderBy: { rateDate: 'desc' },
    });
    const ratePairs = new Map<
      string,
      { latest: number; previous: number }
    >();
    for (const rate of exchangeRates) {
      const pair = `${rate.fromCurrency}/${rate.toCurrency}`;
      const existing = ratePairs.get(pair);
      if (!existing) {
        ratePairs.set(pair, {
          latest: Number(rate.rate),
          previous: Number(rate.rate),
        });
      } else if (Number(rate.rate) !== existing.latest) {
        existing.previous = Number(rate.rate);
      }
    }
    const exchangeRateChanges = Array.from(ratePairs.entries()).map(
      ([pair, r]: [string, { latest: number; previous: number }]) => ({
        currencyPair: pair,
        changePercent:
          r.previous > 0
            ? Math.round(((r.latest - r.previous) / r.previous) * 10000) / 100
            : 0,
      }),
    );

    // Inventory risk summary
    const inventorySnapshots = await this.prisma.inventorySnapshot.findMany({
      where: { companyId },
      orderBy: { snapshotDate: 'desc' },
    });
    const inventoryRiskSummary = {
      totalItems: inventorySnapshots.length,
      lowStockItems: inventorySnapshots.filter(
        (s) => Number(s.qtyOnHand) < 100,
      ).length,
      overstockItems: inventorySnapshots.filter(
        (s) => Number(s.qtyOnHand) > 10000,
      ).length,
    };

    // Production summary
    const productionPlans = await this.prisma.productionPlan.findMany({
      where: { companyId, fiscalYear: currentYear },
    });
    const activeSiteIds = new Set(productionPlans.map((p) => p.siteId));
    const activeProductIds = new Set(productionPlans.map((p) => p.productId));
    const productionSummary = {
      totalPlannedQty: productionPlans.reduce(
        (sum: number, p: { plannedQty: { toString(): string } }) =>
          sum + Number(p.plannedQty),
        0,
      ),
      activeProductCount: activeProductIds.size,
      activeSiteCount: activeSiteIds.size,
    };

    // Get company currency
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    return {
      fiscalYear: currentYear,
      currencyCode: company?.currencyCode ?? 'EGP',
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      grossMarginPercent: Math.round(grossMarginPercent * 100) / 100,
      budgetUtilization: Math.round(budgetUtilization * 100) / 100,
      forecastAccuracy: Math.round(forecastAccuracy * 100) / 100,
      monthlyRevenueTrend,
      topProducts,
      topCustomers,
      rawMaterialPriceChanges,
      exchangeRateChanges,
      inventoryRiskSummary,
      productionSummary,
    };
  }

  /**
   * Build the Gemini prompt using ONLY the aggregated company summary.
   * SECURITY: No raw records, no PII, no credentials are included in the prompt.
   * Injects a strict language instruction based on the requested language.
   */
  private buildPrompt(summary: CompanyFinancialSummary, language: 'en' | 'ar'): string {
    const languageInstruction = language === 'ar'
      ? `LANGUAGE REQUIREMENT (CRITICAL - ARABIC):
- You MUST respond entirely in Arabic (العربية).
- ALL scenario titles, summaries, assumption descriptions, recommended actions, and any text content MUST be in Arabic.
- Do NOT use English words unless they are unavoidable financial terms (e.g., KPI, ROI, USD, EGP).
- Keep numbers, percentages, and currency codes as-is.
- Return valid JSON only.`
      : `LANGUAGE REQUIREMENT (CRITICAL - ENGLISH):
- You MUST respond entirely in English.
- ALL scenario titles, summaries, assumption descriptions, recommended actions, and any text content MUST be in English.
- Keep numbers, percentages, and currency codes as-is.
- Return valid JSON only.`;

    return `You are an FP&A AI Scenario Planner for a company. Based on the following AGGREGATED financial summary, suggest 2-3 realistic business scenarios the company should plan for.

IMPORTANT RULES:
- ONLY use the aggregated data provided below
- Do NOT invent specific customer names, emails, phone numbers, or employee details
- Use anonymized references only (e.g., "Customer 1", "Top Product A")
- Focus on realistic financial planning scenarios

${languageInstruction}

Company Financial Summary:
- Fiscal Year: ${summary.fiscalYear}
- Currency: ${summary.currencyCode}
- Total Revenue: ${summary.totalRevenue.toLocaleString()}
- Total Expenses: ${summary.totalExpenses.toLocaleString()}
- Gross Profit: ${summary.grossProfit.toLocaleString()}
- Net Profit: ${summary.netProfit.toLocaleString()}
- Gross Margin: ${summary.grossMarginPercent}%
- Budget Utilization: ${summary.budgetUtilization}%
- Forecast Accuracy: ${summary.forecastAccuracy}%
- Monthly Revenue Trend: ${JSON.stringify(summary.monthlyRevenueTrend)}
- Top Products: ${JSON.stringify(summary.topProducts)}
- Top Customers (anonymized): ${JSON.stringify(summary.topCustomers)}
- Raw Material Price Changes: ${JSON.stringify(summary.rawMaterialPriceChanges)}
- Exchange Rate Changes: ${JSON.stringify(summary.exchangeRateChanges)}
- Inventory Risk: ${JSON.stringify(summary.inventoryRiskSummary)}
- Production Summary: ${JSON.stringify(summary.productionSummary)}

Return a STRICT JSON response with this exact structure (no markdown, no code blocks):
{
  "scenarios": [
    {
      "title": "string",
      "type": "raw_material_price_increase | currency_change | demand_decrease | branch_expansion | mixed",
      "confidence": number (0-100),
      "summary": "string (2-3 sentences)",
      "assumptions": [
        {
          "key": "string",
          "value": number,
          "unit": "percent | amount | count | text",
          "description": "string"
        }
      ],
      "expectedImpact": {
        "revenueImpactPercent": number,
        "costImpactPercent": number,
        "grossMarginImpactPercent": number,
        "netProfitImpactPercent": number,
        "cashFlowImpactPercent": number
      },
      "recommendedActions": ["string"],
      "simulationInputs": {
        "rawMaterialPriceChangePercent": number,
        "currencyChangePercent": number,
        "demandChangePercent": number,
        "branchExpansionCount": number
      }
    }
  ]
}`;
  }

  /**
   * Try to generate content using a specific Gemini model with exponential backoff.
   * Returns the parsed response or throws if all retries fail.
   */
  private async tryGenerateWithModel(
    model: GenerativeModel,
    prompt: string,
    modelName: string,
    companyId: bigint,
  ): Promise<Record<string, unknown>> {
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        if (attempt > 0) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s
          this.logger.warn(
            `Retrying model ${modelName} (attempt ${attempt + 1}/${MAX_RETRIES_PER_MODEL + 1}) after ${backoffMs}ms backoff for company ${companyId.toString()}`,
          );
          await sleep(backoffMs);
        }

        const result = await Promise.race([
          model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              topP: 0.8,
              responseMimeType: 'application/json',
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Gemini timeout: ${modelName} did not respond within ${GEMINI_TIMEOUT_MS / 1000}s`)),
              GEMINI_TIMEOUT_MS,
            ),
          ),
        ]);

        const responseText = result.response.text();

        // Strip markdown code fences if present
        const cleanedResponse = responseText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(cleanedResponse) as Record<string, unknown>;
        } catch (parseError) {
          this.logger.error(
            `JSON parse failed for model ${modelName}: ${parseError instanceof Error ? parseError.message : 'unknown'}`,
          );
          throw parseError;
        }

        // Validate basic structure
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.scenarios)) {
          throw new Error(`Invalid response structure from ${modelName}: missing scenarios array`);
        }

        this.logger.log(`Model ${modelName} succeeded on attempt ${attempt + 1} for company ${companyId.toString()}`);
        return parsed;
      } catch (error: unknown) {
        lastError = error;

        // If it's an overloaded error, don't retry this model further
        if (this.isOverloadedError(error)) {
          this.logger.warn(
            `Model ${modelName} overloaded (attempt ${attempt + 1}): ${error instanceof Error ? error.message : 'unknown'}`,
          );
          break;
        }

        // For other errors (like JSON parse), retry
        this.logger.warn(
          `Model ${modelName} error (attempt ${attempt + 1}): ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }

    throw lastError;
  }

  /**
   * Call Gemini API with fallback models and exponential backoff.
   * SECURITY: Only aggregated summaries are sent. No raw data.
   * Falls back to deterministic local scenarios if all models fail.
   */
  async generateSuggestions(
    companyId: bigint,
    language: 'en' | 'ar' = 'en',
  ): Promise<AiScenarioResponseDto> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        { message: 'AI suggestions unavailable. Please configure GEMINI_API_KEY.', code: ErrorCodes.AI_UNAVAILABLE },
      );
    }

    // Build safe aggregated summary (no raw data, no PII)
    const summary = await this.buildCompanySummary(companyId);

    this.logger.log(
      `AI scenario generation requested for company ${companyId.toString()} | FY${summary.fiscalYear} | Revenue: ${summary.totalRevenue}`,
    );

    const prompt = this.buildPrompt(summary, language);
    const genAI = new GoogleGenerativeAI(apiKey);

    // Try each model in fallback order
    for (let modelIdx = 0; modelIdx < FALLBACK_MODELS.length; modelIdx++) {
      const modelName = FALLBACK_MODELS[modelIdx];
      const model = genAI.getGenerativeModel({ model: modelName });

      try {
        const parsed = await this.tryGenerateWithModel(model, prompt, modelName, companyId);

        // Normalize response before validation
        const normalized = this.normalizeAiResponse(parsed, language);

        // Strict validation using class-validator
        const { validateSync } = await import('class-validator');
        const { plainToInstance } = await import('class-transformer');

        const responseInstance = plainToInstance(
          AiScenarioResponseDto,
          normalized,
        );
        const errors = validateSync(responseInstance);

        if (errors.length > 0) {
          const diagnostics = errors.map((e) => {
            const path = e.property ?? 'unknown';
            const constraints = Object.values(e.constraints ?? {}).join(', ');
            return `${path}: ${constraints}`;
          });
          this.logger.error(
            `AI response validation failed for model ${modelName} [${diagnostics.join('; ')}]`,
          );
          // Validation failed - try next model
          continue;
        }

        this.logger.log(
          `AI scenario generation completed using model ${modelName}: ${normalized.scenarios.length} scenarios for company ${companyId.toString()}`,
        );

        return normalized;
      } catch (error: unknown) {
        const isLastModel = modelIdx === FALLBACK_MODELS.length - 1;

        if (isLastModel) {
          // All models exhausted - return deterministic local fallback
          this.logger.warn(
            `All Gemini models failed for company ${companyId.toString()}. Returning local fallback scenarios. Last error: ${error instanceof Error ? error.message : 'unknown'}`,
          );
          return this.getLocalFallback(language);
        }

        // Check if it's an overloaded error to log appropriately
        if (this.isOverloadedError(error)) {
          this.logger.warn(
            `Model ${modelName} overloaded for company ${companyId.toString()}, trying next fallback model`,
          );
        } else {
          this.logger.warn(
            `Model ${modelName} failed for company ${companyId.toString()}: ${error instanceof Error ? error.message : 'unknown'}. Trying next fallback model`,
          );
        }
      }
    }

    // Should not reach here, but just in case
    return this.getLocalFallback(language);
  }

  /**
   * Return deterministic local fallback scenarios when all Gemini models fail.
   * These are static, reasonable scenarios that don't require AI generation.
   */
  private getLocalFallback(language: 'en' | 'ar'): AiScenarioResponseDto {
    const scenarios = language === 'ar'
      ? LOCAL_FALLBACK_SCENARIOS.ar
      : LOCAL_FALLBACK_SCENARIOS.en;

    this.logger.log(`Returning ${language} local fallback scenarios (${scenarios.length} scenarios)`);

    return { scenarios };
  }

  /**
   * Normalize raw AI JSON response before class-validator validation.
   * Gemini sometimes returns strings instead of numbers, omits fields,
   * or returns unexpected structures. This function ensures the response
   * matches the expected DTO shape with safe defaults.
   * Provides language-appropriate fallback text based on the requested language.
   */
  private normalizeAiResponse(
    raw: Record<string, unknown>,
    language: 'en' | 'ar',
  ): AiScenarioResponseDto {
    const ALLOWED_TYPES = [
      'raw_material_price_increase',
      'currency_change',
      'demand_decrease',
      'branch_expansion',
      'mixed',
    ] as const;

    const FALLBACK_ACTIONS = language === 'ar'
      ? ['تحليل الوضع المالي', 'مراقبة المؤشرات الرئيسية', 'تحديث الخطط بشكل دوري']
      : ['Analyze current financial position', 'Monitor key metrics', 'Update plans regularly'];

    // Ensure raw is an object
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      this.logger.warn('AI response is not an object, returning empty');
      return { scenarios: [] } as AiScenarioResponseDto;
    }

    const rawScenarios = raw.scenarios;

    // Ensure scenarios is an array
    if (!Array.isArray(rawScenarios)) {
      this.logger.warn('AI response missing scenarios array, returning empty');
      return { scenarios: [] } as AiScenarioResponseDto;
    }

    // Limit to max 3 scenarios
    const limitedScenarios = rawScenarios.slice(0, 3);

    const normalizedScenarios = limitedScenarios
      .filter((item): item is Record<string, unknown> =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
      )
      .map(
        (s: Record<string, unknown>, index: number) => {
        // title: string fallback (language-aware)
        const title = typeof s.title === 'string' && s.title.length > 0
          ? s.title
          : language === 'ar'
            ? 'سيناريو مقترح بالذكاء الاصطناعي'
            : 'AI Suggested Scenario';

        // type: must be one of allowed types; fallback "mixed"
        const type = typeof s.type === 'string' && ALLOWED_TYPES.includes(s.type as typeof ALLOWED_TYPES[number])
          ? s.type
          : 'mixed';

        // confidence: convert to number; clamp 0-100; fallback 50
        const rawConfidence = s.confidence;
        const confidence = typeof rawConfidence === 'number'
          ? Math.max(0, Math.min(100, rawConfidence))
          : typeof rawConfidence === 'string'
            ? Math.max(0, Math.min(100, Number(rawConfidence) || 50))
            : 50;

        // summary: string fallback (language-aware)
        const summary = typeof s.summary === 'string' && s.summary.length > 0
          ? s.summary
          : language === 'ar'
            ? 'سيناريو مولد بالذكاء الاصطناعي بناءً على تحليل البيانات المالية.'
            : 'AI-generated scenario based on financial data analysis.';

        // assumptions: array fallback []
        const rawAssumptions = Array.isArray(s.assumptions) ? s.assumptions : [];
        const assumptions = rawAssumptions.map((a: Record<string, unknown>) => {
          const assumption = a && typeof a === 'object' ? a : {};
          return {
            key: typeof assumption.key === 'string' ? assumption.key : (language === 'ar' ? 'غير معروف' : 'unknown'),
            value: typeof assumption.value === 'number'
              ? assumption.value
              : typeof assumption.value === 'string'
                ? Number(assumption.value) || 0
                : 0,
            unit: typeof assumption.unit === 'string'
              ? assumption.unit
              : 'percent',
            description: typeof assumption.description === 'string'
              ? assumption.description
              : '',
          };
        });

        // expectedImpact: object with all numeric fields fallback 0
        const rawImpact = s.expectedImpact && typeof s.expectedImpact === 'object'
          ? s.expectedImpact as Record<string, unknown>
          : {};
        const expectedImpact = {
          revenueImpactPercent: normalizeNumber(rawImpact.revenueImpactPercent, 0),
          costImpactPercent: normalizeNumber(rawImpact.costImpactPercent, 0),
          grossMarginImpactPercent: normalizeNumber(rawImpact.grossMarginImpactPercent, 0),
          netProfitImpactPercent: normalizeNumber(rawImpact.netProfitImpactPercent, 0),
          cashFlowImpactPercent: normalizeNumber(rawImpact.cashFlowImpactPercent, 0),
        };

        // recommendedActions: array of strings fallback with language-appropriate defaults
        const rawActions = Array.isArray(s.recommendedActions) ? s.recommendedActions : [];
        const recommendedActions = rawActions.length > 0
          ? rawActions.map((a: unknown) =>
              typeof a === 'string' ? a : String(a ?? ''),
            ).filter((a: string) => a.length > 0)
          : FALLBACK_ACTIONS;

        // simulationInputs: object with all numeric fields fallback 0
        const rawSim = s.simulationInputs && typeof s.simulationInputs === 'object'
          ? s.simulationInputs as Record<string, unknown>
          : {};
        const simulationInputs = {
          rawMaterialPriceChangePercent: normalizeNumber(rawSim.rawMaterialPriceChangePercent, 0),
          currencyChangePercent: normalizeNumber(rawSim.currencyChangePercent, 0),
          demandChangePercent: normalizeNumber(rawSim.demandChangePercent, 0),
          branchExpansionCount: normalizeNumber(rawSim.branchExpansionCount, 0),
        };

        return {
          title,
          type,
          confidence,
          summary,
          assumptions,
          expectedImpact,
          recommendedActions,
          simulationInputs,
        };
      },
    );

    return { scenarios: normalizedScenarios } as AiScenarioResponseDto;
  }
}
