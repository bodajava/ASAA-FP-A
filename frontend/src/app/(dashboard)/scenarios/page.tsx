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
  { value: 'increase_material_prices', label: 'Increase Material Prices' },
  { value: 'currency_rate_change', label: 'Currency Rate Change' },
  { value: 'demand_decrease', label: 'Demand Decrease' },
  { value: 'branch_expansion', label: 'Branch Expansion' },
];

export default function ScenariosPage() {
  const { activeCompanyId, tenant } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

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
      toastSuccess('Scenario model deleted successfully.');
      setDeleteConfirmScenario(null);
      void fetchScenarios();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to delete scenario.');
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
      toastSuccess('Simulation completed successfully.');
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
      return 'Please select a planning cycle.';
    }
    if (!simScenarioId) {
      return 'Please select a scenario template model.';
    }
    const selectedScen = scenarios.find((s) => s.id === simScenarioId);
    if (!selectedScen) {
      return 'Selected scenario model not found.';
    }
    const assumptions = selectedScen.assumptions;
    if (!assumptions) {
      return 'Scenario assumptions are missing.';
    }

    const sub = assumptions.subtype;
    if (sub === 'increase_material_prices') {
      if (assumptions.percentage === undefined || assumptions.percentage === null || isNaN(Number(assumptions.percentage))) {
        return 'Percentage price increase is missing or invalid in scenario settings.';
      }
    } else if (sub === 'currency_rate_change') {
      if (!assumptions.fromCurrency || !assumptions.toCurrency) {
        return 'Exchange currencies (From/To) are missing in rate settings.';
      }
      if (assumptions.newRate === undefined || assumptions.newRate === null || isNaN(Number(assumptions.newRate))) {
        return 'New exchange rate is missing or invalid in rate settings.';
      }
    } else if (sub === 'demand_decrease') {
      if (assumptions.percentage === undefined || assumptions.percentage === null || isNaN(Number(assumptions.percentage))) {
        return 'Percentage demand decrease is missing or invalid in scenario settings.';
      }
    } else if (sub === 'branch_expansion') {
      if (!assumptions.siteName || !assumptions.siteName.trim()) {
        return 'Simulated branch/site name is missing in branch expansion settings.';
      }
      if (assumptions.revenueAmount === undefined || assumptions.revenueAmount === null || isNaN(Number(assumptions.revenueAmount))) {
        return 'Annual revenue amount is missing or invalid in branch expansion settings.';
      }
      if (assumptions.expenseAmount === undefined || assumptions.expenseAmount === null || isNaN(Number(assumptions.expenseAmount))) {
        return 'Annual expense amount is missing or invalid in branch expansion settings.';
      }
      if (!assumptions.revenueAccountId) {
        return 'Revenue GL Account is missing in branch expansion settings.';
      }
      if (!assumptions.expenseAccountId) {
        return 'Expense GL Account is missing in branch expansion settings.';
      }
    } else {
      return `Invalid scenario subtype: ${sub}`;
    }

    return null;
  };

  const validationBlocker = getValidationBlocker();

  const columns: Column<Scenario>[] = [
    { key: 'name', header: 'Scenario Name', className: 'font-semibold' },
    {
      key: 'scenarioType',
      header: 'Scenario Type',
      render: (_, row) => {
        const subtype = row.assumptions?.subtype;
        const sub = APPROVED_SCENARIO_TYPES.find((s) => s.value === subtype);
        return <span>{sub?.label ?? subtype ?? '—'}</span>;
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
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteConfirmScenario(row)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Delete"
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
        <PageHeader title="Scenario Planning" description="Simulate business planning decisions and sensitivity analysis" />
        <ErrorState
          title="No active company"
          message="Please select a company from the sidebar before planning scenarios."
        />
      </div>
    );
  }

  const planName = tenant?.plan?.name?.toLowerCase() || 'starter';
  if (planName === 'starter') {
    return (
      <div className="space-y-6">
        <PageHeader title="Scenario Planning" description="Simulate business planning decisions and sensitivity analysis" />
        <LockedState
          title="Scenario Planning is Locked"
          description="Scenario simulation, sensitivity analysis and impact projecting are exclusive to the Business and Enterprise tiers. Define material cost scenarios, currency fluctuations, or branch expansion simulation models."
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
          Scenario Templates
        </button>
        <button
          onClick={() => setActiveTab('simulation')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors duration-150 ${
            activeTab === 'simulation'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Impact Simulation Preview
        </button>
      </div>

      {activeTab === 'list' ? (
        // SCENARIOS LIST TAB
        <div className="space-y-5">
          <PageHeader title="Scenario Models" description="Predefined scenario templates for rapid simulations.">
            <Button size="sm" onClick={() => {
              setEditScenario(null);
              setFormOpen(true);
            }} id="scenarios-create-btn">
              <Plus className="h-4 w-4" /> Add Scenario
            </Button>
          </PageHeader>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search templates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-sm text-slate-400">{total} records</p>
          </div>

          {/* Table */}
          {isLoading ? (
            <LoadingState rows={6} message="Loading scenarios..." />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchScenarios} />
          ) : scenarios.length === 0 ? (
            <EmptyState
              title="No scenario models yet"
              description="Define a scenario model (like material costs shift) to preview how it affects your bottom line."
              action={
                <Button size="sm" onClick={() => {
                  setEditScenario(null);
                  setFormOpen(true);
                }}>
                  <Plus className="h-4 w-4" /> Add Scenario
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
          <PageHeader title="Sensitivity Simulator" description="Select a planning baseline and a scenario model to project changes." />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simulation Setup Panel */}
            <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Simulation Setup</h3>

              {/* Baseline Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Baseline Type</label>
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
                    Budget Cycle
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
                    Forecast Cycle
                  </button>
                </div>
              </div>

              {/* Cycle Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sim-cycle" className="text-xs font-semibold text-slate-500">Select Planning Cycle</label>
                <select
                  id="sim-cycle"
                  value={simBaseId}
                  onChange={(e) => setSimBaseId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Choose cycle...</option>
                  {simBaseType === 'budget'
                    ? budgets.map((b) => <option key={b.id} value={b.id}>{b.name} (FY{b.fiscalYear})</option>)
                    : forecasts.map((f) => <option key={f.id} value={f.id}>{f.name} (FY{f.fiscalYear})</option>)}
                </select>
              </div>

              {/* Scenario Template Selection */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sim-scenario" className="text-xs font-semibold text-slate-500">Scenario Model Template</label>
                <select
                  id="sim-scenario"
                  value={simScenarioId}
                  onChange={(e) => setSimScenarioId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select template...</option>
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({APPROVED_SCENARIO_TYPES.find((sub) => sub.value === s.assumptions?.subtype)?.label ?? s.assumptions?.subtype})
                    </option>
                  ))}
                </select>
              </div>

              {/* Validation Blocker Warning Card */}
              {validationBlocker && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800 flex gap-2.5 items-start mt-2">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Simulation Blocked</p>
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
                <Play className="h-3.5 w-3.5 fill-current" /> Run Impact Simulation
              </Button>
            </div>

            {/* Simulation Results Display Panel */}
            <div className="lg:col-span-2 space-y-4">
              {simError && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-2.5 items-start">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                  <div>
                    <p className="font-semibold">Simulation Failed</p>
                    <p className="text-xs mt-0.5">{simError}</p>
                  </div>
                </div>
              )}

              {simResult ? (
                <div className="space-y-6">
                  {/* Totals Comparison Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Baseline Amount</p>
                      <p className="text-lg font-extrabold text-slate-800 mt-1">${simResult.originalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Simulated Projection</p>
                      <p className="text-lg font-extrabold text-slate-800 mt-1">${simResult.simulatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Simulated Variance</p>
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
                      <Layers className="h-4 w-4 text-emerald-600" /> Projected Itemized Variances
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm max-h-[350px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Account</th>
                            <th className="px-3 py-2 text-left">Month</th>
                            <th className="px-3 py-2 text-right">Original Amt</th>
                            <th className="px-3 py-2 text-right">Simulated Amt</th>
                            <th className="px-3 py-2 text-right">Variance</th>
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
                                <td className="px-3 py-2 text-slate-500">Month {line.periodMonth}</td>
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
                  <p className="text-sm font-semibold text-slate-500 mt-3">Ready to simulate</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">Configure baselines and scenario models, then trigger simulation to view impact analysis.</p>
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
                toastSuccess('Scenario model updated successfully.');
              } else {
                await apiPost<Scenario>('/scenarios', payload);
                toastSuccess('Scenario model created successfully.');
              }
              setFormOpen(false);
              setEditScenario(null);
              void fetchScenarios();
            } catch (err: unknown) {
              const msg = axios.isAxiosError(err)
                ? ((err.response?.data as { message?: string })?.message ?? 'Failed to save scenario model.')
                : 'Failed to save scenario model.';
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
        message={`Are you sure you want to delete the scenario model "${deleteConfirmScenario?.name}"? All saved settings will be deleted. This cannot be undone.`}
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
      title={item ? 'Edit Scenario Model' : 'New Scenario Model'}
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
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Predefined Scenario Templates</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                value: 'increase_material_prices' as ScenarioSubtype,
                label: 'Increase Material Prices',
                description: 'Adjust procurement costs for raw materials.',
                defaultName: 'Increase Material Prices Scenario',
                icon: '📈',
              },
              {
                value: 'currency_rate_change' as ScenarioSubtype,
                label: 'Currency Rate Change',
                description: 'Simulate exchange rate fluctuations.',
                defaultName: 'Currency Rate Change Scenario',
                icon: '💱',
              },
              {
                value: 'demand_decrease' as ScenarioSubtype,
                label: 'Demand Decrease',
                description: 'Contract demand assumptions by percentages.',
                defaultName: 'Demand Contraction Scenario',
                icon: '📉',
              },
              {
                value: 'branch_expansion' as ScenarioSubtype,
                label: 'Branch Expansion',
                description: 'Model incremental performance from a new site.',
                defaultName: 'Branch Expansion Scenario',
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
            label="Scenario Model Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Material Price Shift Q4"
          />
        </div>

        {/* SUBTYPE ASSUMPTIONS BLOCK */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
          {subtype === 'increase_material_prices' && (
            <>
              <Input
                id="scen-percentage"
                label="Percentage Price Increase (%)"
                type="number"
                min="0"
                step="0.1"
                required
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="e.g. 15 for 15%"
              />

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Target Materials (Optional - empty applies to all)</span>
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
                <Input id="from-curr" label="From Currency" value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value.toUpperCase())} placeholder="USD" required />
                <Input id="to-curr" label="To Currency" value={toCurrency} onChange={(e) => setToCurrency(e.target.value.toUpperCase())} placeholder="EGP" required />
                <Input id="new-rate" label="New Exchange Rate" type="number" min="0" step="0.01" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="50.0" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">Target Suppliers (Optional)</span>
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
                  <span className="text-xs font-semibold text-slate-500">Target Accounts (Optional)</span>
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
                label="Percentage Demand Decrease (%)"
                type="number"
                min="0"
                step="0.1"
                required
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="e.g. 20 for 20%"
              />

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Target Products (Optional - empty applies to all)</span>
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
                label="Simulated Branch / Site Name"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Alexandria Branch"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="branch-revenue"
                  label="Annual Revenue Amount"
                  type="number"
                  required
                  value={revenueAmount}
                  onChange={(e) => setRevenueAmount(e.target.value)}
                />
                <Input
                  id="branch-expense"
                  label="Annual Expense Amount"
                  type="number"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="revenue-acc" className="text-xs font-semibold text-slate-500">Revenue Account</label>
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
                  <label htmlFor="expense-acc" className="text-xs font-semibold text-slate-500">Expense Account</label>
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
          <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" isLoading={isLoading}>
            {item ? 'Save Changes' : 'Create Scenario'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
