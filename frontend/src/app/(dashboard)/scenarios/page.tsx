'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Play,
  Layers,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState, EmptyState, ErrorState, LockedState } from '@/components/ui/feedback-states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useTranslateApi } from '@/lib/i18n/translate-api';
import type {
  Scenario,
  ScenarioType,
  ScenarioSubtype,
  ScenarioAssumptions,
  BudgetCycle,
  ForecastCycle,
  Account,
  Material,
  Product,
  Supplier,
  Customer,
  SimulationResult,
  SimulatedLine,
  PaginatedResponse,
} from '@/types/api';
import axios from 'axios';

const APPROVED_SCENARIO_TYPES: { value: ScenarioSubtype; label: string }[] = [
  { value: 'increase_material_prices', label: 'scenarioSubtype.increaseMaterialPrices' },
  { value: 'currency_rate_change', label: 'scenarioSubtype.currencyRateChange' },
  { value: 'demand_decrease', label: 'scenarioSubtype.demandDecrease' },
  { value: 'branch_expansion', label: 'scenarioSubtype.branchExpansion' },
];

export default function ScenariosPage() {
  const { activeCompanyId, tenant } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { t } = useI18n();
  const { tScenarioSubtype } = useTranslateApi();

  // Active Tab: 'scenarios' list or 'simulation' preview
  const [activeTab, setActiveTab] = useState<'list' | 'simulation'>('list');

  // Scenarios List State
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [editScenario, setEditScenario] = useState<Scenario | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirmScenario, setDeleteConfirmScenario] = useState<Scenario | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Master Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [budgets, setBudgets] = useState<BudgetCycle[]>([]);
  const [forecasts, setForecasts] = useState<ForecastCycle[]>([]);

  // Simulation State
  const [simBaseType, setSimBaseType] = useState<'budget' | 'forecast'>('budget');
  const [simBaseId, setSimBaseId] = useState('');
  const [simScenarioId, setSimScenarioId] = useState('');
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load Scenarios
  // ---------------------------------------------------------------------------
  const fetchScenarios = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (search.trim()) {
        params.set('search', search.trim());
      }
      const res = await apiGet<PaginatedResponse<Scenario>>(`/scenarios?${params.toString()}`);
      setScenarios(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scenarios.');
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId, page, search]);

  useEffect(() => {
    void Promise.resolve().then(() => void fetchScenarios());
  }, [fetchScenarios]);

  // ---------------------------------------------------------------------------
  // Load Master Data & Baselines
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeCompanyId) return;
    async function loadData() {
      try {
        const [accs, mats, prds, sups, custs, budgs, forecs] = await Promise.all([
          apiGet<PaginatedResponse<Account>>('/accounts?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Material>>('/materials?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Product>>('/products?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Supplier>>('/suppliers?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Customer>>('/customers?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<BudgetCycle>>('/budgets?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<ForecastCycle>>('/forecasts?limit=1000').then((r) => r.data),
        ]);
        setAccounts(accs);
        setMaterials(mats);
        setProducts(prds);
        setSuppliers(sups);
        setCustomers(custs);
        setBudgets(budgs);
        setForecasts(forecs);

        // Pre-select baselines
        if (budgs.length > 0) {
          setSimBaseId(budgs[0].id);
        }
      } catch {
        // Silent failure
      }
    }
    void loadData();
  }, [activeCompanyId]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  async function handleDeleteScenario() {
    if (!deleteConfirmScenario) return;
    setDeleteLoading(true);
    try {
      await apiDelete<Scenario>(`/scenarios/${deleteConfirmScenario.id}`);
      toastSuccess(t('common.deletedSuccess'));
      setDeleteConfirmScenario(null);
      void fetchScenarios();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : t('common.deleteFailed'));
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleRunSimulation() {
    if (!simBaseId) return;
    setSimLoading(true);
    setSimError(null);
    setSimResult(null);
    try {
      const payload = {
        baseType: simBaseType,
        baseId: simBaseId,
        scenarioId: simScenarioId || undefined,
      };
      const res = await apiPost<SimulationResult>('/scenarios/simulate-preview', payload);
      setSimResult(res);
      toastSuccess(t('common.success'));
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string })?.message ?? 'Simulation failed.')
        : 'Simulation failed.';
      setSimError(msg);
      toastError(msg);
    } finally {
      setSimLoading(false);
    }
  }

  const getValidationBlocker = (): string | null => {
    if (!simBaseId) {
      return t('page.scenarios.pleaseSelectCycle');
    }
    if (!simScenarioId) {
      return t('page.scenarios.pleaseSelectTemplate');
    }
    const selectedScen = scenarios.find((s) => s.id === simScenarioId);
    if (!selectedScen) {
      return t('page.scenarios.templateNotFound');
    }
    const assumptions = selectedScen.assumptions;
    if (!assumptions) {
      return t('page.scenarios.assumptionsMissing');
    }

    const sub = assumptions.subtype;
    if (sub === 'increase_material_prices') {
      if (assumptions.percentage === undefined || assumptions.percentage === null || isNaN(Number(assumptions.percentage))) {
        return t('page.scenarios.pctInvalid');
      }
    } else if (sub === 'currency_rate_change') {
      if (!assumptions.fromCurrency || !assumptions.toCurrency) {
        return t('page.scenarios.currMissing');
      }
      if (assumptions.newRate === undefined || assumptions.newRate === null || isNaN(Number(assumptions.newRate))) {
        return t('page.scenarios.rateInvalid');
      }
    } else if (sub === 'demand_decrease') {
      if (assumptions.percentage === undefined || assumptions.percentage === null || isNaN(Number(assumptions.percentage))) {
        return t('page.scenarios.pctInvalid');
      }
    } else if (sub === 'branch_expansion') {
      if (!assumptions.siteName || !assumptions.siteName.trim()) {
        return t('page.scenarios.siteMissing');
      }
      if (assumptions.revenueAmount === undefined || assumptions.revenueAmount === null || isNaN(Number(assumptions.revenueAmount))) {
        return t('page.scenarios.revenueMissing');
      }
      if (assumptions.expenseAmount === undefined || assumptions.expenseAmount === null || isNaN(Number(assumptions.expenseAmount))) {
        return t('page.scenarios.expenseMissing');
      }
      if (!assumptions.revenueAccountId) {
        return t('page.scenarios.revAccMissing');
      }
      if (!assumptions.expenseAccountId) {
        return t('page.scenarios.expAccMissing');
      }
    } else {
      return t('page.scenarios.invalidSubtype', { sub });
    }

    return null;
  };

  const validationBlocker = getValidationBlocker();

  const columns: Column<Scenario>[] = [
    { key: 'name', header: t('page.scenarios.scenarioName'), className: 'font-semibold' },
    {
      key: 'scenarioType',
      header: t('page.scenarios.scenarioType'),
      render: (_, row) => {
        const subtype = row.assumptions?.subtype;
        return <span>{subtype ? tScenarioSubtype(subtype) : '—'}</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setEditScenario(row);
              setFormOpen(true);
            }}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={t('common.edit')}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteConfirmScenario(row)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label={t('common.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('page.scenarios.title')} description={t('page.scenarios.description')} />
        <ErrorState
          title={t('page.scenarios.noCompanyTitle')}
          message={t('page.scenarios.noCompanyDesc')}
        />
      </div>
    );
  }

  const planName = tenant?.plan?.name?.toLowerCase() || 'starter';
  if (planName === 'starter') {
    return (
      <div className="space-y-6">
        <PageHeader title={t('page.scenarios.title')} description={t('page.scenarios.description')} />
        <LockedState
          title={t('page.scenarios.lockedTitle')}
          description={t('page.scenarios.lockedDesc')}
          requiredPlan="Business"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TABS HEADER */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors duration-150 ${
            activeTab === 'list'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('page.scenarios.scenarioModels')}
        </button>
        <button
          onClick={() => setActiveTab('simulation')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors duration-150 ${
            activeTab === 'simulation'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('page.scenarios.simulationPreview')}
        </button>
      </div>

      {activeTab === 'list' ? (
        // SCENARIOS LIST TAB
        <div className="space-y-5">
          <PageHeader title={t('page.scenarios.scenarioModels')} description="Predefined scenario templates for rapid simulations.">
            <Button size="sm" onClick={() => {
              setEditScenario(null);
              setFormOpen(true);
            }} id="scenarios-create-btn">
              <Plus className="h-4 w-4" /> {t('page.scenarios.addScenario')}
            </Button>
          </PageHeader>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder={t('page.scenarios.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-sm text-slate-400">{t('common.recordsFound', { n: total })}</p>
          </div>

          {/* Table */}
          {isLoading ? (
            <LoadingState rows={6} message={t('common.loading')} />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchScenarios} />
          ) : scenarios.length === 0 ? (
            <EmptyState
              title={t('page.scenarios.emptyTitle')}
              description={t('page.scenarios.emptyDesc')}
              action={
                <Button size="sm" onClick={() => {
                  setEditScenario(null);
                  setFormOpen(true);
                }}>
                  <Plus className="h-4 w-4" /> {t('page.scenarios.addScenario')}
                </Button>
              }
            />
          ) : (
            <>
              <TableWrapper<Scenario>
                data={scenarios}
                columns={columns}
                keyExtractor={(row) => row.id}
              />
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={10}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      ) : (
        // IMPACT SIMULATION TAB
        <div className="space-y-6">
          <PageHeader title={t('page.scenarios.sensitivitySimulator')} description="Select a planning baseline and a scenario model to project changes." />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simulation Setup Panel */}
            <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">{t('page.scenarios.simulationSetup')}</h3>

              {/* Baseline Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">{t('page.scenarios.baselineType')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSimBaseType('budget');
                      if (budgets.length > 0) setSimBaseId(budgets[0].id);
                    }}
                    className={`h-9 text-xs font-medium rounded-lg border px-3 transition-colors ${
                      simBaseType === 'budget'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {t('page.scenarios.budgetCycle')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimBaseType('forecast');
                      if (forecasts.length > 0) setSimBaseId(forecasts[0].id);
                    }}
                    className={`h-9 text-xs font-medium rounded-lg border px-3 transition-colors ${
                      simBaseType === 'forecast'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {t('page.scenarios.forecastCycle')}
                  </button>
                </div>
              </div>

              {/* Cycle Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sim-cycle" className="text-xs font-semibold text-slate-500">{t('page.scenarios.selectCycle')}</label>
                <select
                  id="sim-cycle"
                  value={simBaseId}
                  onChange={(e) => setSimBaseId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{t('page.scenarios.chooseCycle')}</option>
                  {simBaseType === 'budget'
                    ? budgets.map((b) => <option key={b.id} value={b.id}>{b.name} (FY{b.fiscalYear})</option>)
                    : forecasts.map((f) => <option key={f.id} value={f.id}>{f.name} (FY{f.fiscalYear})</option>)}
                </select>
              </div>

              {/* Scenario Template Selection */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sim-scenario" className="text-xs font-semibold text-slate-500">{t('page.scenarios.scenarioModelTemplate')}</label>
                <select
                  id="sim-scenario"
                  value={simScenarioId}
                  onChange={(e) => setSimScenarioId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{t('page.scenarios.selectTemplate')}</option>
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({tScenarioSubtype(s.assumptions?.subtype ?? '')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Validation Blocker Warning Card */}
              {validationBlocker && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800 flex gap-2.5 items-start mt-2">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">{t('page.scenarios.simulationBlocked')}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">{validationBlocker}</p>
                  </div>
                </div>
              )}

              {/* Run Trigger */}
              <Button
                className="w-full flex items-center justify-center gap-1 mt-2"
                disabled={validationBlocker !== null}
                isLoading={simLoading}
                onClick={handleRunSimulation}
              >
                <Play className="h-3.5 w-3.5 fill-current" /> {t('page.scenarios.runSimulation')}
              </Button>
            </div>

            {/* Simulation Results Display Panel */}
            <div className="lg:col-span-2 space-y-4">
              {simError && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-2.5 items-start">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                  <div>
                    <p className="font-semibold">{t('page.scenarios.simulationFailed')}</p>
                    <p className="text-xs mt-0.5">{simError}</p>
                  </div>
                </div>
              )}

              {simResult ? (
                <div className="space-y-6">
                  {/* Totals Comparison Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('page.scenarios.baselineAmount')}</p>
                      <p className="text-lg font-extrabold text-slate-800 mt-1">${simResult.originalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('page.scenarios.simulatedProjection')}</p>
                      <p className="text-lg font-extrabold text-slate-800 mt-1">${simResult.simulatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('page.scenarios.simulatedVariance')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-lg font-extrabold ${simResult.varianceAmount > 0 ? 'text-emerald-700' : simResult.varianceAmount < 0 ? 'text-red-700' : 'text-slate-600'}`}>
                          {simResult.varianceAmount > 0 ? '+' : ''}${simResult.varianceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${simResult.variancePercentage > 0 ? 'bg-emerald-50 text-emerald-700' : simResult.variancePercentage < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-500'}`}>
                          {simResult.variancePercentage > 0 ? '+' : ''}{simResult.variancePercentage.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Lines Detail */}
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-emerald-600" /> {t('page.scenarios.itemizedVariances')}
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm max-h-[350px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">{t('page.scenarios.account')}</th>
                            <th className="px-3 py-2 text-left">{t('page.scenarios.month')}</th>
                            <th className="px-3 py-2 text-right">{t('page.scenarios.originalAmt')}</th>
                            <th className="px-3 py-2 text-right">{t('page.scenarios.simulatedAmt')}</th>
                            <th className="px-3 py-2 text-right">{t('page.scenarios.variance')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {simResult.lines.map((line: SimulatedLine, i: number) => {
                            const accCode = accounts.find((a) => a.id === line.accountId)?.code ?? line.accountId;
                            const accName = accounts.find((a) => a.id === line.accountId)?.name ?? '';
                            return (
                              <tr key={i} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 font-medium">
                                  [{accCode}] {accName}
                                </td>
                                <td className="px-3 py-2 text-slate-500">{t('page.scenarios.month')} {line.periodMonth}</td>
                                <td className="px-3 py-2 text-right font-mono text-slate-600">${line.originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="px-3 py-2 text-right font-mono font-medium text-slate-900">${line.simulatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className={`px-3 py-2 text-right font-mono font-semibold ${line.variance > 0 ? 'text-emerald-700' : line.variance < 0 ? 'text-red-700' : 'text-slate-400'}`}>
                                  {line.variance > 0 ? '+' : ''}{line.variance === 0 ? '—' : `$${line.variance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-16 text-slate-400">
                  <Play className="h-10 w-10 text-slate-300 stroke-[1.5]" />
                  <p className="text-sm font-semibold text-slate-500 mt-3">{t('page.scenarios.readyToSimulate')}</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">{t('page.scenarios.readyToSimulateDesc')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL FOR CREATE/EDIT SCENARIOS */}
      {formOpen && (
        <ScenarioFormModal
          item={editScenario}
          accounts={accounts}
          materials={materials}
          products={products}
          suppliers={suppliers}
          customers={customers}
          onClose={() => {
            setFormOpen(false);
            setEditScenario(null);
          }}
          onSave={async (payload) => {
            setFormLoading(true);
            setFormError(null);
            try {
              if (editScenario) {
                await apiPatch<Scenario>(`/scenarios/${editScenario.id}`, payload);
                toastSuccess(t('common.updatedSuccess'));
              } else {
                await apiPost<Scenario>('/scenarios', payload);
                toastSuccess(t('common.createdSuccess'));
              }
              setFormOpen(false);
              setEditScenario(null);
              void fetchScenarios();
            } catch (err: unknown) {
              const msg = axios.isAxiosError(err)
                ? ((err.response?.data as { message?: string })?.message ?? t('common.error'))
                : t('common.error');
              setFormError(msg);
              toastError(msg);
            } finally {
              setFormLoading(false);
            }
          }}
          isLoading={formLoading}
          error={formError}
        />
      )}

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        open={deleteConfirmScenario !== null}
        message={t('page.scenarios.deleteConfirmMsg', { name: deleteConfirmScenario?.name ?? '' })}
        isLoading={deleteLoading}
        onConfirm={handleDeleteScenario}
        onCancel={() => setDeleteConfirmScenario(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENT: SCENARIO FORM MODAL SUPPORTING 4 SUBTYPES
// ---------------------------------------------------------------------------
interface ScenarioFormModalProps {
  item: Scenario | null;
  accounts: Account[];
  materials: Material[];
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  onClose: () => void;
  onSave: (payload: { name: string; scenarioType: ScenarioType; assumptions: ScenarioAssumptions }) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

function ScenarioFormModal({
  item,
  accounts,
  materials,
  products,
  suppliers,
  customers: _customers,
  onClose,
  onSave,
  isLoading,
  error,
}: ScenarioFormModalProps) {
  const { t } = useI18n();
  const { tScenarioSubtype } = useTranslateApi();
  const [name, setName] = useState(item?.name ?? '');
  const scenarioType: ScenarioType = item?.scenarioType ?? 'custom';

  // Assumptions states
  const [subtype, setSubtype] = useState<ScenarioSubtype>(item?.assumptions?.subtype ?? 'increase_material_prices');
  const [percentage, setPercentage] = useState(item?.assumptions?.percentage?.toString() ?? '10');

  // Specific IDs select (multi-select / search simulation)
  const [selMaterialIds, setSelMaterialIds] = useState<string[]>(item?.assumptions?.materialIds ?? []);
  const [fromCurrency, setFromCurrency] = useState(item?.assumptions?.fromCurrency ?? 'USD');
  const [toCurrency, setToCurrency] = useState(item?.assumptions?.toCurrency ?? 'EGP');
  const [newRate, setNewRate] = useState(item?.assumptions?.newRate?.toString() ?? '48');
  const [selSupplierIds, setSelSupplierIds] = useState<string[]>(item?.assumptions?.targetSupplierIds ?? []);
  const [selCustomerIds, _setSelCustomerIds] = useState<string[]>(item?.assumptions?.targetCustomerIds ?? []);
  const [selAccountIds, setSelAccountIds] = useState<string[]>(item?.assumptions?.targetAccountIds ?? []);
  const [selProductIds, setSelProductIds] = useState<string[]>(item?.assumptions?.productIds ?? []);

  // Branch expansion states
  const [siteName, setSiteName] = useState(item?.assumptions?.siteName ?? '');
  const [revenueAmount, setRevenueAmount] = useState(item?.assumptions?.revenueAmount?.toString() ?? '200000');
  const [expenseAmount, setExpenseAmount] = useState(item?.assumptions?.expenseAmount?.toString() ?? '120000');
  const [revenueAccountId, setRevenueAccountId] = useState(item?.assumptions?.revenueAccountId ?? '');
  const [expenseAccountId, setExpenseAccountId] = useState(item?.assumptions?.expenseAccountId ?? '');

  // Prepopulate branch expansion accounts
  useEffect(() => {
    void Promise.resolve().then(() => {
      if (!revenueAccountId && accounts.length > 0) {
        const rev = accounts.find((a) => a.accountType === 'revenue');
        if (rev) setRevenueAccountId(rev.id);
      }
      if (!expenseAccountId && accounts.length > 0) {
        const exp = accounts.find((a) => a.accountType === 'expense');
        if (exp) setExpenseAccountId(exp.id);
      }
    });
  }, [accounts, revenueAccountId, expenseAccountId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    // Assemble assumptions payload based on subtype
    let assumptions: ScenarioAssumptions;

    if (subtype === 'increase_material_prices') {
      assumptions = {
        subtype,
        percentage: Number(percentage),
        materialIds: selMaterialIds.length > 0 ? selMaterialIds : undefined,
      };
    } else if (subtype === 'currency_rate_change') {
      assumptions = {
        subtype,
        fromCurrency,
        toCurrency,
        newRate: Number(newRate),
        targetSupplierIds: selSupplierIds.length > 0 ? selSupplierIds : undefined,
        targetCustomerIds: selCustomerIds.length > 0 ? selCustomerIds : undefined,
        targetAccountIds: selAccountIds.length > 0 ? selAccountIds : undefined,
      };
    } else if (subtype === 'demand_decrease') {
      assumptions = {
        subtype,
        percentage: Number(percentage),
        productIds: selProductIds.length > 0 ? selProductIds : undefined,
      };
    } else {
      // branch_expansion
      assumptions = {
        subtype,
        siteName: siteName.trim(),
        revenueAmount: Number(revenueAmount),
        expenseAmount: Number(expenseAmount),
        revenueAccountId,
        expenseAccountId,
      };
    }

    await onSave({
      name: name.trim(),
      scenarioType,
      assumptions,
    });
  }

  function handleMultiSelect(id: string, list: string[], setList: (arr: string[]) => void) {
    if (list.includes(id)) {
      setList(list.filter((x) => x !== id));
    } else {
      setList([...list, id]);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? t('page.scenarios.editTitle') : t('page.scenarios.createTitle')}
      description="Define assumptions and sensitivity details for the projection simulation."
      size="lg"
      className="max-h-[90vh] flex flex-col"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] pr-1">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('page.scenarios.predefinedTemplates')}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                value: 'increase_material_prices' as ScenarioSubtype,
                label: t('scenarioSubtype.increaseMaterialPrices'),
                description: 'Adjust procurement costs for raw materials.',
                defaultName: t('scenarioDefaultName.increaseMaterialPrices'),
                icon: '📈',
              },
              {
                value: 'currency_rate_change' as ScenarioSubtype,
                label: t('scenarioSubtype.currencyRateChange'),
                description: 'Simulate exchange rate fluctuations.',
                defaultName: t('scenarioDefaultName.currencyRateChange'),
                icon: '💱',
              },
              {
                value: 'demand_decrease' as ScenarioSubtype,
                label: t('scenarioSubtype.demandDecrease'),
                description: 'Contract demand assumptions by percentages.',
                defaultName: t('scenarioDefaultName.demandDecrease'),
                icon: '📉',
              },
              {
                value: 'branch_expansion' as ScenarioSubtype,
                label: t('scenarioSubtype.branchExpansion'),
                description: 'Model incremental performance from a new site.',
                defaultName: t('scenarioDefaultName.branchExpansion'),
                icon: '🏢',
              },
            ].map((tc) => {
              const isSelected = subtype === tc.value;
              return (
                <button
                  key={tc.value}
                  type="button"
                  onClick={() => {
                    setSubtype(tc.value);
                    if (!item) {
                      setName(tc.defaultName);
                    }
                  }}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm shadow-emerald-100/10 ring-1 ring-emerald-600'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tc.icon}</span>
                    <span className={`text-xs font-bold ${isSelected ? 'text-emerald-955' : 'text-slate-800'}`}>{tc.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">{tc.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Input
            id="scenario-name"
            label={t('page.scenarios.scenarioName')}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('page.scenarios.namePlaceholder')}
          />
        </div>

        {/* SUBTYPE ASSUMPTIONS BLOCK */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
          {subtype === 'increase_material_prices' && (
            <>
              <Input
                id="scen-percentage"
                label={t('page.scenarios.percentageIncrease')}
                type="number"
                min="0"
                step="0.1"
                required
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="e.g. 15 for 15%"
              />

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500">{t('page.scenarios.targetMaterials')}</span>
                <div className="max-h-[120px] overflow-y-auto border border-slate-200 bg-white rounded-lg p-2 space-y-1">
                  {materials.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={selMaterialIds.includes(m.id)}
                        onChange={() => handleMultiSelect(m.id, selMaterialIds, setSelMaterialIds)}
                        className="rounded border-slate-300 accent-emerald-600"
                      />
                      [{m.code}] {m.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {subtype === 'currency_rate_change' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Input id="from-curr" label={t('page.scenarios.fromCurrency')} value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value.toUpperCase())} placeholder="USD" required />
                <Input id="to-curr" label={t('page.scenarios.toCurrency')} value={toCurrency} onChange={(e) => setToCurrency(e.target.value.toUpperCase())} placeholder="EGP" required />
                <Input id="new-rate" label={t('page.scenarios.newRate')} type="number" min="0" step="0.01" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="50.0" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">{t('page.scenarios.targetSuppliers')}</span>
                  <div className="max-h-[100px] overflow-y-auto border border-slate-200 bg-white rounded-lg p-2 space-y-1">
                    {suppliers.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-xs text-slate-700">
                        <input type="checkbox" checked={selSupplierIds.includes(s.id)} onChange={() => handleMultiSelect(s.id, selSupplierIds, setSelSupplierIds)} className="rounded border-slate-300 accent-emerald-600" />
                        {s.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">{t('page.scenarios.targetAccounts')}</span>
                  <div className="max-h-[100px] overflow-y-auto border border-slate-200 bg-white rounded-lg p-2 space-y-1">
                    {accounts.map((a) => (
                      <label key={a.id} className="flex items-center gap-2 text-xs text-slate-700">
                        <input type="checkbox" checked={selAccountIds.includes(a.id)} onChange={() => handleMultiSelect(a.id, selAccountIds, setSelAccountIds)} className="rounded border-slate-300 accent-emerald-600" />
                        [{a.code}] {a.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {subtype === 'demand_decrease' && (
            <>
              <Input
                id="scen-demand-pct"
                label={t('page.scenarios.percentageDecrease')}
                type="number"
                min="0"
                step="0.1"
                required
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="e.g. 20 for 20%"
              />

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500">{t('page.scenarios.targetProducts')}</span>
                <div className="max-h-[120px] overflow-y-auto border border-slate-200 bg-white rounded-lg p-2 space-y-1">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs text-slate-700">
                      <input type="checkbox" checked={selProductIds.includes(p.id)} onChange={() => handleMultiSelect(p.id, selProductIds, setSelProductIds)} className="rounded border-slate-300 accent-emerald-600" />
                      [{p.sku}] {p.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {subtype === 'branch_expansion' && (
            <>
              <Input
                id="branch-name"
                label={t('page.scenarios.siteName')}
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Alexandria Branch"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="branch-revenue"
                  label={t('page.scenarios.annualRevenue')}
                  type="number"
                  required
                  value={revenueAmount}
                  onChange={(e) => setRevenueAmount(e.target.value)}
                />
                <Input
                  id="branch-expense"
                  label={t('page.scenarios.annualExpense')}
                  type="number"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="revenue-acc" className="text-xs font-semibold text-slate-500">{t('page.scenarios.revenueAccount')}</label>
                  <select
                    id="revenue-acc"
                    value={revenueAccountId}
                    onChange={(e) => setRevenueAccountId(e.target.value)}
                    className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700"
                    required
                  >
                    {accounts.filter((a) => a.accountType === 'revenue').map((a) => (
                      <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="expense-acc" className="text-xs font-semibold text-slate-500">{t('page.scenarios.expenseAccount')}</label>
                  <select
                    id="expense-acc"
                    value={expenseAccountId}
                    onChange={(e) => setExpenseAccountId(e.target.value)}
                    className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700"
                    required
                  >
                    {accounts.filter((a) => a.accountType === 'expense').map((a) => (
                      <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>{t('common.cancel')}</Button>
          <Button size="sm" type="submit" isLoading={isLoading}>
            {item ? t('page.scenarios.saveChanges') : t('page.scenarios.createScenario')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
