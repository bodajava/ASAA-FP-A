'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/feedback-states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { HeadcountPlan, BudgetCycle, Site, CostCenter } from '@/types/api';
import { Plus, Users, DollarSign, Briefcase, Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';

export default function HeadcountPlansPage() {
  const { activeCompanyId } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [cycles, setCycles] = useState<BudgetCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [loadingCycles, setLoadingCycles] = useState(false);

  const [plans, setPlans] = useState<HeadcountPlan[]>([]);
  const [summary, setSummary] = useState<{
    grandTotalCost: number;
    grandHeadcount: number;
    monthly: { month: number; headcount: number; totalCost: number }[];
    byDepartment: { dept: string; cost: number }[];
  } | null>(null);

  const [loadingPlans, setLoadingPlans] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdowns for form
  const [sites, setSites] = useState<Site[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

  // Modals & Forms
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<HeadcountPlan | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [deleteItem, setDeleteItem] = useState<HeadcountPlan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form values
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState<'full_time' | 'part_time' | 'contract' | 'seasonal'>('full_time');
  const [headcount, setHeadcount] = useState('1');
  const [periodMonth, setPeriodMonth] = useState('1');
  const [basicSalary, setBasicSalary] = useState('0');
  const [allowances, setAllowances] = useState('0');
  const [socialInsurance, setSocialInsurance] = useState('0');
  const [siteId, setSiteId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch Budget Cycles
  useEffect(() => {
    async function loadCycles() {
      if (!activeCompanyId) return;
      setLoadingCycles(true);
      try {
        const res = await apiGet<{ data: BudgetCycle[] }>('/budgets?limit=100');
        const activeCycles = res.data ?? [];
        setCycles(activeCycles);
        if (activeCycles.length > 0) {
          setSelectedCycleId(activeCycles[0].id);
        }
      } catch (err) {
        console.error('Failed to load budget cycles', err);
      } finally {
        setLoadingCycles(false);
      }
    }
    void loadCycles();
  }, [activeCompanyId]);

  // Load Dropdowns
  useEffect(() => {
    async function loadDropdowns() {
      if (!activeCompanyId) return;
      try {
        const [sitesRes, ccRes] = await Promise.all([
          apiGet<{ data: Site[] }>('/sites?limit=100'),
          apiGet<{ data: CostCenter[] }>('/cost-centers?limit=100'),
        ]);
        setSites(sitesRes.data ?? []);
        setCostCenters(ccRes.data ?? []);
      } catch (err) {
        console.error('Failed to load dropdowns', err);
      }
    }
    void loadDropdowns();
  }, [activeCompanyId]);

  const loadPlans = useCallback(async () => {
    if (!selectedCycleId) return;
    setLoadingPlans(true);
    setError(null);
    try {
      const [listRes, summaryRes] = await Promise.all([
        apiGet<HeadcountPlan[]>(`/headcount-plans?cycleId=${selectedCycleId}`),
        apiGet<any>(`/headcount-plans/summary/${selectedCycleId}`),
      ]);
      setPlans(listRes ?? []);
      setSummary(summaryRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch headcount plans.');
    } finally {
      setLoadingPlans(false);
    }
  }, [selectedCycleId]);

  useEffect(() => {
    if (selectedCycleId) {
      void loadPlans();
    } else {
      setPlans([]);
      setSummary(null);
    }
  }, [selectedCycleId, loadPlans]);

  function openCreate() {
    setEditItem(null);
    setJobTitle('');
    setDepartment('');
    setEmploymentType('full_time');
    setHeadcount('1');
    setPeriodMonth('1');
    setBasicSalary('0');
    setAllowances('0');
    setSocialInsurance('0');
    setSiteId('');
    setCostCenterId('');
    setNotes('');
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(item: HeadcountPlan) {
    setEditItem(item);
    setJobTitle(item.jobTitle);
    setDepartment(item.department ?? '');
    setEmploymentType(item.employmentType);
    setHeadcount(String(item.headcount));
    setPeriodMonth(String(item.periodMonth));
    setBasicSalary(String(item.basicSalary));
    setAllowances(String(item.allowances));
    setSocialInsurance(String(item.socialInsurance));
    setSiteId(item.siteId ?? '');
    setCostCenterId(item.costCenterId ?? '');
    setNotes(item.notes ?? '');
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    const payload: Record<string, unknown> = {
      budgetCycleId: selectedCycleId,
      jobTitle,
      employmentType,
      headcount: parseInt(headcount),
      periodMonth: parseInt(periodMonth),
      basicSalary: parseFloat(basicSalary),
      allowances: parseFloat(allowances),
      socialInsurance: parseFloat(socialInsurance),
    };
    if (department) payload.department = department;
    if (siteId) payload.siteId = Number(siteId);
    if (costCenterId) payload.costCenterId = Number(costCenterId);
    if (notes) payload.notes = notes;

    try {
      if (editItem) {
        await apiPatch(`/headcount-plans/${editItem.id}`, payload);
        toastSuccess('Position updated successfully.');
      } else {
        await apiPost('/headcount-plans', payload);
        toastSuccess('Position added successfully.');
      }
      setFormOpen(false);
      void loadPlans();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFormError((err.response?.data as any)?.message ?? 'Operation failed.');
      } else {
        setFormError('An unexpected error occurred.');
      }
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/headcount-plans/${deleteItem.id}`);
      toastSuccess('Position deleted successfully.');
      setDeleteItem(null);
      void loadPlans();
    } catch (err) {
      toastError('Delete failed.');
    } finally {
      setDeleteLoading(false);
    }
  }

  const columns: Column<HeadcountPlan>[] = [
    { key: 'jobTitle', header: 'Job Title', className: 'font-semibold text-slate-700' },
    { key: 'department', header: 'Department', render: (v) => String(v ?? '—') },
    { key: 'employmentType', header: 'Type', render: (v) => String(v).replace('_', ' ').toUpperCase(), className: 'text-xs text-slate-500 font-mono' },
    { key: 'headcount', header: 'Count', className: 'text-right font-mono' },
    { key: 'periodMonth', header: 'Month', render: (v) => `M${v}`, className: 'text-center font-mono text-xs' },
    { key: 'basicSalary', header: 'Basic', render: (v) => Number(v).toLocaleString(), className: 'text-right font-mono text-slate-600' },
    { key: 'totalCost', header: 'Total Cost (EGP)', render: (v) => Number(v).toLocaleString(), className: 'text-right font-mono font-bold text-slate-900' },
    {
      key: '_actions',
      header: '',
      className: 'w-24',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEdit(row)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteItem(row)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Headcount Planning" />
        <ErrorState title="No active company" message="Please select a company from the sidebar." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Headcount Planning" description="Forecast workforce levels, salaries, and associated benefits by department or site">
        <div className="flex items-center gap-3">
          {loadingCycles ? (
            <p className="text-sm text-slate-400">Loading cycles...</p>
          ) : (
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select Budget Cycle...</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.fiscalYear})
                </option>
              ))}
            </select>
          )}
          {selectedCycleId && (
            <Button size="sm" onClick={openCreate} id="add-headcount-btn">
              <Plus className="h-4 w-4" /> Add Position
            </Button>
          )}
        </div>
      </PageHeader>

      {selectedCycleId && summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Total Positions</p>
              <h3 className="text-xl font-bold text-slate-800">{summary.grandHeadcount}</h3>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="rounded-lg bg-indigo-50 p-3 text-indigo-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Total Workforce Cost</p>
              <h3 className="text-xl font-bold text-slate-800">EGP {summary.grandTotalCost.toLocaleString()}</h3>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="rounded-lg bg-amber-50 p-3 text-amber-600">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Departments Configured</p>
              <h3 className="text-xl font-bold text-slate-800">{summary.byDepartment.length}</h3>
            </div>
          </div>
        </div>
      )}

      {!selectedCycleId ? (
        <EmptyState title="No cycle selected" description="Select a budget cycle from the top menu to view and plan workforce headcount." />
      ) : loadingPlans ? (
        <LoadingState rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPlans} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Workforce Budget Table</h3>
              <TableWrapper<HeadcountPlan>
                data={plans}
                columns={columns}
                keyExtractor={(row) => row.id}
              />
            </div>
          </div>

          <div className="space-y-6">
            {summary && summary.byDepartment.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Cost by Department</h3>
                <div className="space-y-3">
                  {summary.byDepartment.map((d) => {
                    const pct = summary.grandTotalCost > 0 ? (d.cost / summary.grandTotalCost) * 100 : 0;
                    return (
                      <div key={d.dept} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-600 capitalize">{d.dept}</span>
                          <span className="font-mono text-slate-500">EGP {d.cost.toLocaleString()} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {summary && (
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Distribution</h3>
                <div className="flex h-32 items-end justify-between gap-1 pt-4">
                  {summary.monthly.map((m) => {
                    const maxCost = Math.max(...summary.monthly.map((x) => x.totalCost)) || 1;
                    const height = (m.totalCost / maxCost) * 100;
                    return (
                      <div key={m.month} className="flex flex-1 flex-col items-center gap-1 group relative">
                        <div
                          className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-all cursor-pointer"
                          style={{ height: `${height}%`, minHeight: m.totalCost > 0 ? '4px' : '0px' }}
                        />
                        <span className="text-[10px] text-slate-400 font-mono">M{m.month}</span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-slate-800 text-white text-[10px] rounded p-1.5 shadow font-mono whitespace-nowrap">
                          Cost: EGP {m.totalCost.toLocaleString()}<br />
                          Count: {m.headcount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFormOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {editItem ? 'Edit Workforce Position' : 'Add New Workforce Position'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <Input id="job-title" label="Job Title" required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Production Engineer" />
              <Input id="dept-name" label="Department" required value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Production" />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="employment-type" className="text-xs font-medium text-slate-500">Employment Type</label>
                  <select
                    id="employment-type"
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as any)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="seasonal">Seasonal</option>
                  </select>
                </div>

                <Input id="period-month" type="number" label="Planning Month (1-12)" required value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} min={1} max={12} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input id="headcount-count" type="number" label="Headcount" required value={headcount} onChange={(e) => setHeadcount(e.target.value)} min={1} />
                <Input id="basic-sal" type="number" label="Monthly Basic Salary" required value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input id="allowance" type="number" label="Monthly Allowances" required value={allowances} onChange={(e) => setAllowances(e.target.value)} />
                <Input id="insurance" type="number" label="Social Insurance Cost" required value={socialInsurance} onChange={(e) => setSocialInsurance(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="site-scope" className="text-xs font-medium text-slate-500">Site (Optional)</label>
                  <select
                    id="site-scope"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Sites</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cc-scope" className="text-xs font-medium text-slate-500">Cost Center (Optional)</label>
                  <select
                    id="cc-scope"
                    value={costCenterId}
                    onChange={(e) => setCostCenterId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">None</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>[{cc.code}] {cc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="notes-field" className="text-xs font-medium text-slate-500">Notes</label>
                <textarea
                  id="notes-field"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                  placeholder="Additional position details..."
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button size="sm" type="submit" isLoading={formLoading}>{editItem ? 'Save Changes' : 'Add Position'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteItem !== null}
        message="Are you sure you want to delete this position from headcount plans? This will update cycle summaries."
        isLoading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
