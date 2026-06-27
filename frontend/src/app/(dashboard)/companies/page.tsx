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
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Company } from '@/types/api';
import { MONTH_NAMES } from '@/lib/constants';
import axios from 'axios';
import { apiPost } from '@/lib/api';
import { CompanyWizard } from '@/components/company-wizard';

interface FormProps {
  item: Company | null;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

function CompanyForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
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
      <Input id="company-name" label={t('page.companies.companyName')} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Corp" />
      <Input id="company-code" label={t('common.code')} required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. ACME" />
      <div className="grid grid-cols-2 gap-3">
        <Input id="company-currency" label={t('common.currency')} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="EGP" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="company-fiscal-year" className="text-sm font-medium text-slate-700">{t('page.companies.fiscalYearMonth')}</label>
          <select
            id="company-fiscal-year"
            value={fiscalYearStart}
            onChange={(e) => setFiscalYearStart(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {MONTH_NAMES.slice(1).map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>
          {item ? t('page.companies.saveChanges') : t('page.companies.createCompany')}
        </Button>
      </div>
    </form>
  );
}

export default function CompaniesPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { activeCompanyId, setActiveCompany, refreshUser } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const list = usePaginatedList<Company>({
    endpoint: '/companies',
    limit: 20,
    enabled: true,
    requireCompany: false,
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
        if (!activeCompanyId) {
          setActiveCompany(created.id);
          setTimeout(() => router.push('/'), 300);
        }
      }
      await refreshUser();
      closeForm();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string } | undefined)?.message ??
          t('common.error');
        setFormError(msg);
      } else {
        setFormError(t('common.error'));
      }
    } finally {
      setFormLoading(false);
    }
  }

  async function handleWizardSubmit(wizardData: {
    name: string;
    code: string;
    industryType: string;
    taxNumber: string;
    currency: string;
    fiscalYearStart: number;
    createDefaultUnits: boolean;
    createDefaultAccounts: boolean;
  }) {
    setFormLoading(true);
    setFormError(null);
    try {
      const companyPayload = {
        name: wizardData.name,
        code: wizardData.code,
        currency: wizardData.currency,
        fiscalYearStart: wizardData.fiscalYearStart,
      };
      const created = await list.create(companyPayload);

      if (wizardData.createDefaultUnits) {
        const defaultUnits = [
          { name: 'Pieces', symbol: 'pc' },
          { name: 'Kg', symbol: 'kg' },
          { name: 'Liters', symbol: 'L' },
          { name: 'Meters', symbol: 'm' },
          { name: 'Box', symbol: 'box' },
          { name: 'Carton', symbol: 'ctn' },
        ];
        for (const unit of defaultUnits) {
          await apiPost('/units', unit);
        }
      }

      if (wizardData.createDefaultAccounts) {
        const defaultAccounts = [
          { code: '1000', name: 'Cash', accountType: 'asset' },
          { code: '1100', name: 'Accounts Receivable', accountType: 'asset' },
          { code: '1200', name: 'Inventory', accountType: 'asset' },
          { code: '2000', name: 'Accounts Payable', accountType: 'liability' },
          { code: '3000', name: 'Owner Equity', accountType: 'equity' },
          { code: '4000', name: 'Sales Revenue', accountType: 'revenue' },
          { code: '5000', name: 'Cost of Goods Sold', accountType: 'expense' },
          { code: '5100', name: 'Rent Expense', accountType: 'expense' },
          { code: '5200', name: 'Salary Expense', accountType: 'expense' },
        ];
        for (const acc of defaultAccounts) {
          await apiPost('/accounts', acc);
        }
      }

      if (!activeCompanyId) {
        setActiveCompany(created.id);
        setTimeout(() => router.push('/'), 300);
      }
      await refreshUser();
      closeForm();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string } | undefined)?.message ??
          t('common.error');
        setFormError(msg);
      } else {
        setFormError(t('common.error'));
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
      if (activeCompanyId === deleteItem.id) {
        setActiveCompany(list.data.find((c) => c.id !== deleteItem.id)?.id ?? '');
      }
      setDeleteItem(null);
      await refreshUser();
      toastSuccess(t('page.companies.deletedSuccess'));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string } | undefined)?.message ??
          t('page.companies.deleteFailed');
        toastError(msg);
      } else {
        toastError(t('page.companies.unexpectedDeleteError'));
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleSelect(company: Company) {
    setActiveCompany(company.id);
    router.push('/');
  }

  const columns: Column<Company>[] = [
    {
      key: '_active',
      header: '',
      className: 'w-8',
      render: (_v, row) =>
        row.id === activeCompanyId ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label={t('common.active')} />
        ) : (
          <Circle className="h-4 w-4 text-slate-300" aria-hidden />
        ),
    },
    { key: 'name', header: t('common.name') },
    { key: 'code', header: t('common.code'), className: 'font-mono text-xs' },
    { key: 'currency', header: t('common.currency') },
    {
      key: 'fiscalYearStart',
      header: t('page.companies.fiscalYearStart'),
      render: (v) => (v ? `${t('common.month')} ${String(v)}` : '—'),
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
              aria-label={`${t('common.select')} ${row.name}`}
            >
              {t('common.select')}
            </button>
          )}
          <button
            onClick={() => openEdit(row)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={`${t('common.edit')} ${row.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteItem(row)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label={`${t('common.delete')} ${row.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t('page.companies.title')} description={t('page.companies.description')}>
        <Button size="sm" onClick={openCreate} id="companies-create-btn">
          <Plus className="h-4 w-4" />
          {t('page.companies.addCompany')}
        </Button>
      </PageHeader>

      {!activeCompanyId && list.data.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{t('page.companies.selectCompanyCallout')}</strong> — {t('page.companies.selectCompanyCalloutDesc', { action: t('common.select') })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder={`${t('common.search')}…`}
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={t('common.search')}
          />
        </div>
        <p className="text-sm text-slate-400">{list.total} {t('common.records')}</p>
      </div>

      {list.isLoading ? (
        <LoadingState rows={6} message={t('page.companies.loading')} />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.refresh} />
      ) : list.data.length === 0 ? (
        <EmptyState
          title={t('page.companies.emptyTitle')}
          description={t('page.companies.emptyDescription')}
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('page.companies.addCompany')}
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

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeForm}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {editItem ? t('page.companies.editTitle') : t('page.companies.createTitle')}
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
              {editItem ? (
                <CompanyForm
                  item={editItem}
                  onClose={closeForm}
                  onSubmit={handleSubmit}
                  isLoading={formLoading}
                />
              ) : (
                <CompanyWizard
                  onSubmit={handleWizardSubmit}
                  isLoading={formLoading}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteItem !== null}
        message={t('page.companies.deleteConfirmMsg')}
        isLoading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
