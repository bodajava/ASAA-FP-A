'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/i18n-context';
import { translateErrorCode } from '@/lib/i18n/error-code-map';
import { apiPost } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type {
  AiScenarioResponse,
  AiScenarioSuggestion,
  AiUnavailableResponse,
} from '@/types/api';
import type { ScenarioSubtype, ScenarioAssumptions } from '@/types/api';
import type { TranslationKey } from '@/lib/i18n/translations';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface AiScenarioPlannerProps {
  onApplyScenario: (assumptions: ScenarioAssumptions, name: string) => void;
}

// ---------------------------------------------------------------------------
// Confidence badge color helper
// ---------------------------------------------------------------------------
function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (confidence >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

// ---------------------------------------------------------------------------
// Scenario type badge
// ---------------------------------------------------------------------------
function getScenarioTypeBadge(
  type: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): { label: string; color: string } {
  switch (type) {
    case 'raw_material_price_increase':
      return { label: t('page.scenarios.typeMaterialCost'), color: 'bg-orange-50 text-orange-700 border-orange-200' };
    case 'currency_change':
      return { label: t('page.scenarios.typeCurrency'), color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'demand_decrease':
      return { label: t('page.scenarios.typeDemand'), color: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'branch_expansion':
      return { label: t('page.scenarios.typeExpansion'), color: 'bg-teal-50 text-teal-700 border-teal-200' };
    case 'mixed':
      return { label: t('page.scenarios.typeMixed'), color: 'bg-slate-50 text-slate-700 border-slate-200' };
    default:
      return { label: type, color: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
}

// ---------------------------------------------------------------------------
// Map AI type to our ScenarioSubtype
// ---------------------------------------------------------------------------
function mapAiTypeToSubtype(type: string): ScenarioSubtype {
  switch (type) {
    case 'raw_material_price_increase':
      return 'increase_material_prices';
    case 'currency_change':
      return 'currency_rate_change';
    case 'demand_decrease':
      return 'demand_decrease';
    case 'branch_expansion':
      return 'branch_expansion';
    default:
      return 'increase_material_prices';
  }
}

// ---------------------------------------------------------------------------
// Impact Bar Component
// ---------------------------------------------------------------------------
function ImpactBar({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const absVal = Math.min(Math.abs(value), 100);
  const barWidth = absVal;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-slate-500 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isPositive ? 'bg-emerald-500' : isNegative ? 'bg-red-500' : 'bg-slate-300'}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span
        className={`w-14 text-right font-mono font-semibold ${isPositive ? 'text-emerald-700' : isNegative ? 'text-red-700' : 'text-slate-500'}`}
      >
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scenario Card Component
// ---------------------------------------------------------------------------
function ScenarioCard({
  suggestion,
  onApply,
}: {
  suggestion: AiScenarioSuggestion;
  onApply: (assumptions: ScenarioAssumptions, name: string) => void;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const typeBadge = getScenarioTypeBadge(suggestion.type, t);

  function handleApply() {
    const subtype = mapAiTypeToSubtype(suggestion.type);
    const simInputs = suggestion.simulationInputs;

    let assumptions: ScenarioAssumptions;

    if (subtype === 'increase_material_prices') {
      assumptions = {
        subtype,
        percentage: simInputs.rawMaterialPriceChangePercent,
      };
    } else if (subtype === 'currency_rate_change') {
      assumptions = {
        subtype,
        fromCurrency: 'USD',
        toCurrency: 'EGP',
        newRate: 1 + simInputs.currencyChangePercent / 100,
      };
    } else if (subtype === 'demand_decrease') {
      assumptions = {
        subtype,
        percentage: Math.abs(simInputs.demandChangePercent),
      };
    } else {
      assumptions = {
        subtype,
        siteName: `AI Suggested Branch ${suggestion.title}`,
        revenueAmount: 200000,
        expenseAmount: 120000,
        revenueAccountId: '',
        expenseAccountId: '',
      };
    }

    onApply(assumptions, suggestion.title);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {suggestion.title}
              </h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeBadge.color}`}
              >
                {typeBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {suggestion.summary}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${getConfidenceColor(suggestion.confidence)}`}
          >
            {t('page.scenarios.confidence')}: {suggestion.confidence}%
          </span>
        </div>
      </div>

      {/* Expected Impact */}
      <div className="px-5 pb-3 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {t('page.scenarios.expectedImpact')}
        </p>
        <ImpactBar label={t('page.scenarios.impactRevenue')} value={suggestion.expectedImpact.revenueImpactPercent} />
        <ImpactBar label={t('page.scenarios.impactCosts')} value={suggestion.expectedImpact.costImpactPercent} />
        <ImpactBar label={t('page.scenarios.impactGrossMargin')} value={suggestion.expectedImpact.grossMarginImpactPercent} />
        <ImpactBar label={t('page.scenarios.impactNetProfit')} value={suggestion.expectedImpact.netProfitImpactPercent} />
        <ImpactBar label={t('page.scenarios.impactCashFlow')} value={suggestion.expectedImpact.cashFlowImpactPercent} />
      </div>

      {/* Expandable details */}
      <div className="border-t border-slate-100">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <span>{t('page.scenarios.assumptions')} & {t('page.scenarios.recommendedActions')}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expanded && (
          <div className="px-5 pb-4 space-y-3">
            {/* Assumptions */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {t('page.scenarios.assumptions')}
              </p>
              <div className="space-y-1">
                {suggestion.assumptions.map((assumption, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <span className="font-mono font-semibold text-slate-700 shrink-0">
                      {assumption.key}:
                    </span>
                    <span className="text-slate-600">
                      {assumption.value} {assumption.unit} — {assumption.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Actions */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {t('page.scenarios.recommendedActions')}
              </p>
              <ul className="space-y-1">
                {suggestion.recommendedActions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Apply Button */}
      <div className="px-5 pb-4">
        <Button
          size="sm"
          className="w-full"
          onClick={handleApply}
        >
          {t('page.scenarios.applyToScenario')}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AI Scenario Planner Component
// ---------------------------------------------------------------------------
export function AiScenarioPlanner({ onApplyScenario }: AiScenarioPlannerProps) {
  const { t, locale } = useI18n();
  const { success: toastSuccess, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AiScenarioSuggestion[] | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  // Request cancellation: track AbortController and request ID
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  // Retry cooldown: prevent rapid retries
  const [retryCooldown, setRetryCooldown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount: abort any pending request and clear cooldown timer
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const startCooldown = useCallback(() => {
    setRetryCooldown(true);
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = setTimeout(() => {
      setRetryCooldown(false);
      cooldownTimerRef.current = null;
    }, 5000);
  }, []);

  const handleGenerate = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const currentRequestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setSuggestions(null);
    setAiUnavailable(false);

    try {
      const res = await apiPost<AiScenarioResponse | AiUnavailableResponse>(
        '/scenarios/ai-suggestions',
        { language: locale === 'ar' ? 'ar' : 'en' },
        { signal: controller.signal },
      );

      // Ignore stale responses from cancelled requests
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Check if AI is unavailable
      if ('available' in res && res.available === false) {
        setAiUnavailable(true);
        return;
      }

      const data = res as AiScenarioResponse;
      if (data.scenarios && data.scenarios.length > 0) {
        setSuggestions(data.scenarios);
        toastSuccess(t('common.success'));
      } else {
        setError(t('page.scenarios.aiGenerateFailed'));
        startCooldown();
      }
    } catch (err: unknown) {
      // Ignore stale responses from cancelled requests
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Don't show error for aborted requests
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      let msg = t('page.scenarios.aiGenerateFailed');
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { code?: string; message?: string } } };
        if (axiosErr.response?.data?.code) {
          msg = translateErrorCode(axiosErr.response.data.code, t);
        } else if (axiosErr.response?.data?.message) {
          msg = axiosErr.response.data.message;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      toastError(msg);
      startCooldown();
    } finally {
      // Only clear loading if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [locale, t, toastSuccess, toastError, startCooldown]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Generate Button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={isLoading ? handleCancel : handleGenerate}
          disabled={false}
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t('common.cancel')}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {t('page.scenarios.generateAiScenario')}
            </>
          )}
        </Button>
        {isLoading && (
          <p className="text-xs text-slate-500 animate-pulse">
            {t('page.scenarios.aiGenerating')}
          </p>
        )}
      </div>

      {/* AI Unavailable Message */}
      {aiUnavailable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-2.5 items-start">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold">{t('page.scenarios.aiPlanner')}</p>
            <p className="text-xs mt-0.5">{t('page.scenarios.aiSuggestionsUnavailable')}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-2.5 items-start">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{t('page.scenarios.aiGenerateFailed')}</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={retryCooldown}
            className="shrink-0"
          >
            {retryCooldown ? t('common.loading') : t('common.retry')}
          </Button>
        </div>
      )}

      {/* Suggestion Cards */}
      {suggestions && suggestions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {suggestions.map((suggestion, idx) => (
            <ScenarioCard
              key={idx}
              suggestion={suggestion}
              onApply={onApplyScenario}
            />
          ))}
        </div>
      )}
    </div>
  );
}
