import { Injectable } from '@nestjs/common';

export interface ForecastResult {
  amount: number;
  confidence: number;
  driverType: string;
  seasonalityDetected: boolean;
  trendDetected: boolean;
}

export interface AccuracyMetrics {
  mape: number;
  mae: number;
  rmse: number;
  r2: number;
}

@Injectable()
export class ForecastEngineService {
  private readonly MIN_DATA_POINTS = 3;
  private readonly DEFAULT_ALPHA = 0.3;
  private readonly DEFAULT_BETA = 0.1;
  private readonly DEFAULT_GAMMA = 0.1;
  private readonly SEASON_LENGTH = 12;

  /**
   * Weighted Moving Average with exponential weights (more weight to recent)
   */
  weightedMovingAverage(
    data: number[],
    window: number = Math.min(data.length, 6),
  ): number {
    if (data.length === 0) return 0;
    const effectiveWindow = Math.min(window, data.length);
    const sliced = data.slice(-effectiveWindow);
    const weights = Array.from({ length: effectiveWindow }, (_, i) => i + 1);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    return (
      sliced.reduce((sum, val, i) => sum + val * weights[i], 0) / weightSum
    );
  }

  /**
   * Simple Exponential Smoothing
   */
  exponentialSmoothing(
    data: number[],
    alpha: number = this.DEFAULT_ALPHA,
  ): number {
    if (data.length === 0) return 0;
    let result = data[0];
    for (let i = 1; i < data.length; i++) {
      result = alpha * data[i] + (1 - alpha) * result;
    }
    return result;
  }

  /**
   * Holt's Linear Trend Method (Double Exponential Smoothing)
   */
  holtLinear(
    data: number[],
    alpha: number = this.DEFAULT_ALPHA,
    beta: number = this.DEFAULT_BETA,
    forecastPeriods: number = 1,
  ): number[] {
    if (data.length < 2) return [data[data.length - 1] ?? 0];

    let level = data[0];
    let trend = data[1] - data[0];
    if (trend === 0 && data.length > 2) {
      trend = (data[data.length - 1] - data[0]) / (data.length - 1);
    }

    for (let i = 1; i < data.length; i++) {
      const lastLevel = level;
      level = alpha * data[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - lastLevel) + (1 - beta) * trend;
    }

    return Array.from({ length: forecastPeriods }, (_, i) =>
      Number((level + (i + 1) * trend).toFixed(2)),
    );
  }

  /**
   * Holt-Winters Triple Exponential Smoothing with Multiplicative Seasonality
   */
  holtWinters(
    data: number[],
    seasonLength: number = this.SEASON_LENGTH,
    alpha: number = this.DEFAULT_ALPHA,
    beta: number = this.DEFAULT_BETA,
    gamma: number = this.DEFAULT_GAMMA,
    forecastPeriods: number = 1,
  ): number[] {
    if (data.length < seasonLength * 2)
      return this.holtLinear(data, alpha, beta, forecastPeriods);

    const seasonal: number[] = [];
    for (let i = 0; i < seasonLength; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i; j < data.length; j += seasonLength) {
        sum += data[j];
        count++;
      }
      seasonal.push(sum / count);
    }
    const avgSeasonal = seasonal.reduce((a, b) => a + b, 0) / seasonLength;
    for (let i = 0; i < seasonLength; i++) {
      seasonal[i] = avgSeasonal > 0 ? seasonal[i] / avgSeasonal : 1;
    }

    let level = data[0] / (seasonal[0] || 1);
    let trend = 0;
    if (data.length > seasonLength) {
      trend = (data[seasonLength] / (seasonal[0] || 1) - level) / seasonLength;
    }

    for (let i = 0; i < data.length; i++) {
      const lastLevel = level;
      const sIdx = i % seasonLength;
      level =
        alpha * (data[i] / (seasonal[sIdx] || 1)) +
        (1 - alpha) * (level + trend);
      trend = beta * (level - lastLevel) + (1 - beta) * trend;
      seasonal[sIdx] =
        gamma * (data[i] / level) + (1 - gamma) * (seasonal[sIdx] || 1);
    }

    return Array.from({ length: forecastPeriods }, (_, i) => {
      const sIdx = (data.length + i) % seasonLength;
      return Number(
        ((level + (i + 1) * trend) * (seasonal[sIdx] || 1)).toFixed(2),
      );
    });
  }

  /**
   * Seasonal Naive: use the same period from last cycle
   */
  seasonalNaive(
    data: number[],
    seasonLength: number = this.SEASON_LENGTH,
  ): number {
    if (data.length < seasonLength) return data[data.length - 1] ?? 0;
    const cycles = Math.floor(data.length / seasonLength);
    const seasonalPattern = [];
    for (let i = 0; i < seasonLength; i++) {
      let sum = 0;
      let count = 0;
      for (let c = 0; c < cycles; c++) {
        const idx = c * seasonLength + i;
        if (idx < data.length) {
          sum += data[idx];
          count++;
        }
      }
      seasonalPattern.push(count > 0 ? sum / count : 0);
    }
    const lastCycleGrowth =
      cycles >= 2
        ? data
            .slice(-seasonLength)
            .reduce((s, v, i) => s + (data[i] > 0 ? v / data[i] : 1), 0) /
          seasonLength
        : 1;

    return seasonalPattern[0] * lastCycleGrowth;
  }

  /**
   * Detect if data has significant seasonality
   */
  detectSeasonality(
    data: number[],
    seasonLength: number = this.SEASON_LENGTH,
  ): { hasSeasonality: boolean; seasonalFactors: number[] } {
    if (data.length < seasonLength * 2)
      return { hasSeasonality: false, seasonalFactors: [] };

    const seasonalFactors: number[] = [];
    const overallAvg = data.reduce((a, b) => a + b, 0) / data.length;

    for (let i = 0; i < seasonLength; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i; j < data.length; j += seasonLength) {
        sum += data[j];
        count++;
      }
      const periodAvg = count > 0 ? sum / count : overallAvg;
      seasonalFactors.push(overallAvg > 0 ? periodAvg / overallAvg : 1);
    }

    const maxDev = Math.max(...seasonalFactors.map((f) => Math.abs(f - 1)));

    return {
      hasSeasonality: maxDev > 0.15,
      seasonalFactors,
    };
  }

  /**
   * Detect if data has a significant trend
   */
  detectTrend(data: number[]): { hasTrend: boolean; slope: number } {
    if (data.length < 2) return { hasTrend: false, slope: 0 };
    const n = data.length;
    const xMean = (n - 1) / 2;
    const yMean = data.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (data[i] - yMean);
      den += (i - xMean) * (i - xMean);
    }
    const slope = den > 0 ? num / den : 0;
    const hasTrend = Math.abs(slope) > yMean * 0.02 || false;
    return { hasTrend, slope };
  }

  /**
   * Egyptian Market: Adjust for Ramadan (Islamic calendar shifts ~11 days earlier each year)
   * ramadanMonth: the Gregorian month number when Ramadan falls in the forecast year
   */
  adjustForRamadan(
    baseAmount: number,
    month: number,
    ramadanMonth: number,
  ): number {
    const monthsSinceRamadan = (month - ramadanMonth + 12) % 12;
    if (monthsSinceRamadan === 0) {
      return baseAmount * 1.35;
    } else if (monthsSinceRamadan === 1) {
      return baseAmount * 1.2;
    } else if (monthsSinceRamadan === 11) {
      return baseAmount * 1.15;
    }
    return baseAmount;
  }

  /**
   * Egyptian Market: Adjust for inflation
   */
  adjustForInflation(
    amount: number,
    monthsAgo: number,
    monthlyInflationRate: number,
  ): number {
    return amount * Math.pow(1 + monthlyInflationRate, monthsAgo);
  }

  /**
   * Get the target forecast amount using automatic method selection
   * based on data characteristics (seasonality, trend)
   */
  getForecast(
    historicalData: number[],
    options: {
      baseMonth?: number;
      ramadanMonth?: number;
      monthlyInflationRate?: number;
      seasonLength?: number;
    } = {},
  ): ForecastResult {
    const {
      baseMonth = 1,
      ramadanMonth,
      monthlyInflationRate = 0,
      seasonLength = this.SEASON_LENGTH,
    } = options;

    if (historicalData.length === 0) {
      return {
        amount: 0,
        confidence: 0,
        driverType: 'no_data',
        seasonalityDetected: false,
        trendDetected: false,
      };
    }

    const positiveData = historicalData.filter((v) => v > 0);
    if (positiveData.length < this.MIN_DATA_POINTS) {
      const avg =
        positiveData.length > 0
          ? positiveData.reduce((a, b) => a + b, 0) / positiveData.length
          : 0;
      return {
        amount: avg,
        confidence: 0.1,
        driverType: 'insufficient_data',
        seasonalityDetected: false,
        trendDetected: false,
      };
    }

    const { hasSeasonality, seasonalFactors } = this.detectSeasonality(
      historicalData,
      seasonLength,
    );
    const { hasTrend } = this.detectTrend(historicalData);

    let amount: number;
    let driverType: string;
    let confidence: number;

    if (hasSeasonality && historicalData.length >= seasonLength * 2) {
      const forecasts = this.holtWinters(historicalData, seasonLength);
      amount = forecasts[0] ?? 0;
      driverType = 'seasonal_holt_winters';
      confidence = Math.min(0.85, 0.4 + positiveData.length * 0.03);
    } else if (hasTrend && historicalData.length >= 4) {
      const forecasts = this.holtLinear(historicalData);
      amount = forecasts[0] ?? 0;
      driverType = 'trend_holt';
      confidence = Math.min(0.8, 0.35 + positiveData.length * 0.025);
    } else {
      amount = this.exponentialSmoothing(historicalData);
      driverType = 'exponential_smoothing';
      confidence = Math.min(0.7, 0.3 + positiveData.length * 0.02);
    }

    if (amount < 0) amount = 0;

    if (ramadanMonth && ramadanMonth >= 1 && ramadanMonth <= 12) {
      const targetMonth = baseMonth === 12 ? 1 : baseMonth + 1;
      amount = this.adjustForRamadan(amount, targetMonth, ramadanMonth);
      driverType = `${driverType}_ramadan_adjusted`;
    }

    if (monthlyInflationRate > 0) {
      amount = this.adjustForInflation(amount, 1, monthlyInflationRate);
    }

    return {
      amount: Number(amount.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      driverType,
      seasonalityDetected: hasSeasonality,
      trendDetected: hasTrend,
    };
  }

  /**
   * Compute accuracy metrics comparing actual vs forecast
   */
  computeAccuracy(actual: number[], forecast: number[]): AccuracyMetrics {
    if (actual.length === 0 || forecast.length === 0) {
      return { mape: 0, mae: 0, rmse: 0, r2: 0 };
    }

    const n = Math.min(actual.length, forecast.length);
    let sumAbsPctError = 0;
    let sumAbsError = 0;
    let sumSqError = 0;
    let count = 0;
    const actualMean = actual.slice(0, n).reduce((a, b) => a + b, 0) / n;

    for (let i = 0; i < n; i++) {
      const a = actual[i];
      const f = forecast[i];
      const error = Math.abs(a - f);
      sumAbsError += error;
      sumSqError += error * error;
      if (a !== 0) {
        sumAbsPctError += (error / Math.abs(a)) * 100;
        count++;
      }
    }

    const mae = sumAbsError / n;
    const rmse = Math.sqrt(sumSqError / n);
    const mape = count > 0 ? sumAbsPctError / count : 0;

    const ssRes = sumSqError;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      ssTot += (actual[i] - actualMean) * (actual[i] - actualMean);
    }
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return {
      mape: Number(mape.toFixed(2)),
      mae: Number(mae.toFixed(2)),
      rmse: Number(rmse.toFixed(2)),
      r2: Number(r2.toFixed(4)),
    };
  }

  /**
   * Prepare monthly historical data for a specific account
   * Input: array of { month: number, amount: number } from actuals
   * Output: array of 12 values (Jan-Dec) with missing months = 0
   */
  prepareMonthlyData(
    monthlyRecords: { month: number; amount: number }[],
  ): number[] {
    const data = new Array(12).fill(0);
    for (const record of monthlyRecords) {
      if (record.month >= 1 && record.month <= 12) {
        data[record.month - 1] += record.amount;
      }
    }
    return data;
  }

  /**
   * Build historical data series from multiple years
   */
  buildTimeSeries(
    yearlyData: { year: number; month: number; amount: number }[],
  ): number[] {
    const sorted = [...yearlyData].sort(
      (a, b) => a.year - b.year || a.month - b.month,
    );
    return sorted.map((r) => r.amount);
  }
}
