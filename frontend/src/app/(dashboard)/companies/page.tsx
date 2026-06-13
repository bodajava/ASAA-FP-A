'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/feedback-states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import type { Company } from '@/types/api';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------
interface FormProps {
  item: Company | null;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

function CompanyForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [code, setCode] = useState(item?.code ?? '');
  const [currency, setCurrency] = useState(item?.currency ?? 'EGP');
  const [fiscalYearStart, setFiscalYearStart] = useState(
    item?.fiscalYearStart?.toString() ?? '1',
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      name,
      code,
      currency: currency || undefined,
      fiscalYearStart: fiscalYearStart ? Number(fiscalYearStart) : undefined,
    };
    await onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input id="company-name" label="Company Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Corp" />
      <Input id="company-code" label="Code" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. ACME" />
      <div className="grid grid-cols-2 gap-3">
        <Input id="company-currency" label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="EGP" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="company-fiscal-year" className="text-sm font-medium text-slate-700">Fiscal Year Start (month)</label>
          <select
            id="company-fiscal-year"
            value={fiscalYearStart}
            onChange={(e) => setFiscalYearStart(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>
          {item ? 'Save Changes' : 'Create Company'}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CompaniesPage() {
  const router = useRouter();
  const { activeCompanyId, setActiveCompany, refreshUser } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  // Companies do not require a company selection to fetch — they ARE the
  // selection step, so we always enable the list fetch here.
  const list = usePaginatedList<Company>({
    endpoint: '/companies',
    limit: 20,
    enabled: true,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Company | null>(null);
  const [deleteItem, setDeleteItem] = useState<Company | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditItem(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(item: Company) {
    setEditItem(item);
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditItem(null);
    setFormError(null);
  }

  async function handleSubmit(payload: Record<string, unknown>) {
    setFormLoading(true);
    setFormError(null);
    try {
      if (editItem) {
        await list.update(editItem.id, payload);
      } else {
        const created = await list.create(payload);
        // Auto-select the first company created so the user can proceed immediately
        if (!activeCompanyId) {
          setActiveCompany(created.id);
          // Small delay then navigate to dashboard
          setTimeout(() => router.push('/'), 300);
        }
      }
      await refreshUser();
      closeForm();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string } | undefined)?.message ??
          'Operation failed.';
        setFormError(msg);
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
      await list.remove(deleteItem.id);
      // If we deleted the active company, clear it
      if (activeCompanyId === deleteItem.id) {
        setActiveCompany(list.data.find((c) => c.id !== deleteItem.id)?.id ?? '');
      }
      setDeleteItem(null);
      await refreshUser();
      toastSuccess('Company deleted successfully.');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string } | undefined)?.message ??
          'Failed to delete company.';
        toastError(msg);
      } else {
        toastError('An unexpected error occurred while deleting the company.');
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleSelect(company: Company) {
    setActiveCompany(company.id);
    router.push('/');
  }

  // Build columns including an "Active" indicator and a Select button
  const columns: Column<Company>[] = [
    {
      key: '_active',
      header: '',
      className: 'w-8',
      render: (_v, row) =>
        row.id === activeCompanyId ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Active company" />
        ) : (
          <Circle className="h-4 w-4 text-slate-300" aria-hidden />
        ),
    },
    { key: 'name', header: 'Name' },
    { key: 'code', header: 'Code', className: 'font-mono text-xs' },
    { key: 'currency', header: 'Currency' },
    {
      key: 'fiscalYearStart',
      header: 'Fiscal Year Start',
      render: (v) => (v ? `Month ${String(v)}` : '—'),
    },
    {
      key: '_actions',
      header: '',
      className: 'w-40',
      render: (_v, row) => (
        <div className="flex items-center justify-end gap-1">
          {row.id !== activeCompanyId && (
            <button
              onClick={() => handleSelect(row)}
              className="rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
              aria-label={`Select ${row.name}`}
            >
              Select
            </button>
          )}
          <button
            onClick={() => openEdit(row)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={`Edit ${row.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteItem(row)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${row.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Companies" description="Manage companies in your tenant">
        <Button size="sm" onClick={openCreate} id="companies-create-btn">
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </PageHeader>

      {/* No active company callout — shown only when there are companies to choose from */}
      {!activeCompanyId && list.data.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Select a company</strong> — click the{' '}
          <span className="font-semibold text-emerald-700">Select</span> button
          next to the company you want to work with.
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search…"
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Search companies"
          />
        </div>
        <p className="text-sm text-slate-400">{list.total} records</p>
      </div>

      {/* Table */}
      {list.isLoading ? (
        <LoadingState rows={6} message="Loading companies…" />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.refresh} />
      ) : list.data.length === 0 ? (
        <EmptyState
          title="No companies yet"
          description="Add your first company to get started."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Company
            </Button>
          }
        />
      ) : (
        <>
          <TableWrapper<Company>
            data={list.data}
            columns={columns}
            keyExtractor={(row) => row.id}
          />
          <Pagination
            page={list.page}
            totalPages={list.totalPages}
            total={list.total}
            limit={20}
            onPageChange={list.setPage}
          />
        </>
      )}

      {/* Form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeForm}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {editItem ? 'Edit Company' : 'New Company'}
              </h2>
            </div>
            <div className="px-6 py-5">
              {formError && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {formError}
                </div>
              )}
              <CompanyForm
                item={editItem}
                onClose={closeForm}
                onSubmit={handleSubmit}
                isLoading={formLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteItem !== null}
        message="This action cannot be undone. Are you sure you want to delete this company?"
        isLoading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
