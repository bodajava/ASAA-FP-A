'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Download
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/feedback-states';
import { useAuth } from '@/lib/auth-context';
import { apiGet } from '@/lib/api';
import { MONTH_NAMES, getCurrentFiscalYear } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/i18n-context';
import { getApiErrorMessage } from '@/lib/api-error-handler';
import { queryKeys } from '@/lib/query-keys';
import type {
  VarianceRecord,
  Account,
  Site,
  Product,
  Customer,
  PaginatedResponse,
} from '@/types/api';

type CompareType = 'budget-vs-actual' | 'budget-vs-forecast' | 'actual-vs-forecast' | 'budget-actual-forecast';

export default function VariancePage() {
  const { activeCompanyId } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Comparison Tab
  const [compareType, setCompareType] = useState<CompareType>('budget-vs-actual');

  // Filters State
  const [fiscalYear, setFiscalYear] = useState(String(getCurrentFiscalYear()));
  const [periodMonth, setPeriodMonth] = useState('');
  const [accountId, setAccountId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [productId, setProductId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [compareType, fiscalYear, periodMonth, accountId, siteId, productId, customerId]);

  // ---------------------------------------------------------------------------
  // Load Master Data via TanStack Query
  // ---------------------------------------------------------------------------
  const masterDataQuery = useQuery({
    queryKey: [...queryKeys.variance.all, 'master-data', activeCompanyId],
    queryFn: async ({ signal }) => {
      const [accs, sts, prds, custs] = await Promise.all([
        apiGet<PaginatedResponse<Account>>('/accounts?limit=1000', { signal }).then((r) => r.data),
        apiGet<PaginatedResponse<Site>>('/sites?limit=1000', { signal }).then((r) => r.data),
        apiGet<PaginatedResponse<Product>>('/products?limit=1000', { signal }).then((r) => r.data),
        apiGet<PaginatedResponse<Customer>>('/customers?limit=1000', { signal }).then((r) => r.data),
      ]);
      return { accs, sts, prds, custs };
    },
    enabled: Boolean(activeCompanyId),
    staleTime: 10 * 60 * 1000,
    meta: { persist: true },
  });

  const accounts = masterDataQuery.data?.accs ?? [];
  const sites = masterDataQuery.data?.sts ?? [];
  const products = masterDataQuery.data?.prds ?? [];
  const customers = masterDataQuery.data?.custs ?? [];

  // ---------------------------------------------------------------------------
  // Load Variance Report Data via TanStack Query
  // ---------------------------------------------------------------------------
  const varianceQuery = useQuery({
    queryKey: [
      ...queryKeys.variance.all,
      activeCompanyId,
      compareType,
      page,
      fiscalYear,
      periodMonth,
      accountId,
      siteId,
      productId,
      customerId,
      debouncedSearch,
    ],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (fiscalYear) params.set('fiscal_year', fiscalYear);
      if (periodMonth) params.set('period_month', periodMonth);
      if (accountId) params.set('account_id', accountId);
      if (siteId) params.set('site_id', siteId);
      if (productId) params.set('product_id', productId);
      if (customerId) params.set('customer_id', customerId);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      return apiGet<PaginatedResponse<VarianceRecord>>(`/variance/${compareType}?${params.toString()}`, { signal });
    },
    enabled: Boolean(activeCompanyId),
    placeholderData: (prev) => prev,
    staleTime: 2 * 60 * 1000,
  });

  const records = varianceQuery.data?.data ?? [];
  const total = varianceQuery.data?.total ?? 0;
  const totalPages = varianceQuery.data?.totalPages ?? 1;

  const error = varianceQuery.error ? getApiErrorMessage(varianceQuery.error, t) : null;

  // Export handler
  async function handleExport() {
    if (!activeCompanyId) return;
    try {
      const params = new URLSearchParams();
      if (fiscalYear) params.set('fiscal_year', fiscalYear);
      if (periodMonth) params.set('period_month', periodMonth);
      if (accountId) params.set('account_id', accountId);
      if (siteId) params.set('site_id', siteId);
      if (productId) params.set('product_id', productId);
      if (customerId) params.set('customer_id', customerId);
      const { default: api } = await import('@/lib/api');
      const res = await api.get(`/variance/${compareType}/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `variance-${compareType}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Export failed silently
    }
  }

  // ---------------------------------------------------------------------------
  // Color-Coding Helpers
  // ---------------------------------------------------------------------------
  function renderVariance(amount: number, percentage: number | null, accId: string) {
    if (amount === 0) {
      return <span className="text-slate-400 font-mono">—</span>;
    }

    const acc = accounts.find((a) => a.id === accId);
    const accType = acc?.accountType ?? 'expense';

    let isFavorable = amount > 0;
    if (accType === 'expense' || accType === 'liability') {
      isFavorable = amount < 0;
    }

    const sign = amount > 0 ? '+' : '';
    const formattedAmount = `${sign}$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formattedPct = percentage !== null ? ` (${sign}${percentage.toFixed(1)}%)` : '';

    return (
      <div className="flex flex-col items-end">
        <span className={`font-semibold font-mono ${isFavorable ? 'text-emerald-700' : 'text-red-700'}`}>
          {formattedAmount}
        </span>
        <span className={`text-[10px] font-mono ${isFavorable ? 'text-emerald-600' : 'text-red-500'}`}>
          {formattedPct}
        </span>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Columns Configuration
  // ---------------------------------------------------------------------------
  const columns: Column<VarianceRecord>[] = useMemo(() => {
    const cols: Column<VarianceRecord>[] = [
      {
        key: 'account_id',
        header: t('page.variance.account'),
        render: (v) => {
          const acc = accounts.find((a) => a.id === String(v));
          return (
            <div>
              <p className="font-semibold text-slate-800">{acc?.name ?? 'Unknown'}</p>
              <p className="font-mono text-[10px] text-slate-400">Code: {acc?.code ?? String(v)}</p>
            </div>
          );
        },
      },
      {
        key: 'period_month',
        header: t('page.variance.period'),
        render: (v, row) => `FY${row.fiscal_year} M${String(v)}`,
      },
      {
        key: 'site_id',
        header: t('page.variance.site'),
        render: (v) => sites.find((s) => s.id === String(v))?.name ?? '—',
      },
      {
        key: 'product_id',
        header: t('page.variance.productCustomer'),
        render: (v, row) => {
          const prod = products.find((p) => p.id === String(v))?.name;
          const cust = customers.find((c) => c.id === row.customer_id)?.name;
          return (
            <div className="max-w-[150px] truncate" title={[prod, cust].filter(Boolean).join(' / ')}>
              <p className="text-slate-700 text-xs">{prod ?? '—'}</p>
              {cust && <p className="text-slate-400 text-[10px] italic">Cust: {cust}</p>}
            </div>
          );
        },
      },
    ];

    if (compareType === 'budget-vs-actual') {
      cols.push(
        { key: 'budget_amount', header: t('page.variance.budget'), className: 'text-right font-mono text-xs', render: (v) => `$${Number(v).toLocaleString()}` },
        { key: 'actual_amount', header: t('page.variance.actual'), className: 'text-right font-mono text-xs font-semibold', render: (v) => `$${Number(v).toLocaleString()}` },
        {
          key: 'variance_amount',
          header: t('page.variance.varianceActBud'),
          className: 'text-right',
          render: (_, row) => renderVariance(row.variance_amount, row.variance_pct, row.account_id),
        }
      );
    } else if (compareType === 'budget-vs-forecast') {
      cols.push(
        { key: 'budget_amount', header: t('page.variance.budget'), className: 'text-right font-mono text-xs', render: (v) => `$${Number(v).toLocaleString()}` },
        { key: 'forecast_amount', header: t('page.variance.forecast'), className: 'text-right font-mono text-xs font-semibold', render: (v) => `$${Number(v).toLocaleString()}` },
        {
          key: 'variance_amount',
          header: t('page.variance.varianceForBud'),
          className: 'text-right',
          render: (_, row) => renderVariance(row.variance_amount, row.variance_pct, row.account_id),
        }
      );
    } else if (compareType === 'actual-vs-forecast') {
      cols.push(
        { key: 'actual_amount', header: t('page.variance.actual'), className: 'text-right font-mono text-xs', render: (v) => `$${Number(v).toLocaleString()}` },
        { key: 'forecast_amount', header: t('page.variance.forecast'), className: 'text-right font-mono text-xs font-semibold', render: (v) => `$${Number(v).toLocaleString()}` },
        {
          key: 'variance_amount',
          header: t('page.variance.varianceForAct'),
          className: 'text-right',
          render: (_, row) => renderVariance(row.variance_amount, row.variance_pct, row.account_id),
        }
      );
    } else {
      cols.push(
        { key: 'budget_amount', header: t('page.variance.budget'), className: 'text-right font-mono text-xs text-slate-500', render: (v) => `$${Number(v).toLocaleString()}` },
        { key: 'actual_amount', header: t('page.variance.actual'), className: 'text-right font-mono text-xs text-slate-700', render: (v) => `$${Number(v).toLocaleString()}` },
        { key: 'forecast_amount', header: t('page.variance.forecast'), className: 'text-right font-mono text-xs text-slate-700 border-r border-slate-100', render: (v) => `$${Number(v).toLocaleString()}` },
        {
          key: 'actual_vs_budget_amount',
          header: t('page.variance.actVsBud'),
          className: 'text-right',
          render: (_, row) => renderVariance(row.actual_vs_budget_amount ?? 0, row.actual_vs_budget_pct ?? null, row.account_id),
        },
        {
          key: 'forecast_vs_budget_amount',
          header: t('page.variance.forVsBud'),
          className: 'text-right',
          render: (_, row) => renderVariance(row.forecast_vs_budget_amount ?? 0, row.forecast_vs_budget_pct ?? null, row.account_id),
        },
        {
          key: 'forecast_vs_actual_amount',
          header: t('page.variance.forVsAct'),
          className: 'text-right',
          render: (_, row) => renderVariance(row.forecast_vs_actual_amount ?? 0, row.forecast_vs_actual_pct ?? null, row.account_id),
        }
      );
    }

    return cols;
  }, [compareType, accounts, sites, products, customers, t]);

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('page.variance.title')} description={t('page.variance.description')} />
        <ErrorState
          title="No active company"
          message="Please select a company from the sidebar before viewing variance analysis."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t('page.variance.title')} description={t('page.variance.description')} />

      {/* Tabs for comparison modes */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {(
          [
            { value: 'budget-vs-actual', label: t('page.variance.budgetVsActual') },
            { value: 'budget-vs-forecast', label: t('page.variance.budgetVsForecast') },
            { value: 'actual-vs-forecast', label: t('page.variance.actualVsForecast') },
            { value: 'budget-actual-forecast', label: t('page.variance.threeWay') },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setCompareType(tab.value)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors duration-150 ${
              compareType === tab.value
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
          <Filter className="h-4.5 w-4.5 text-emerald-600" /> {t('page.variance.filterAnalysis')}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Input
            id="v-year"
            label={t('page.variance.fiscalYear')}
            type="number"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            placeholder="2026"
            className="h-8 py-1.5 text-xs"
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="v-month" className="text-xs font-semibold text-slate-500">{t('page.variance.periodMonth')}</label>
            <select
              id="v-month"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">{t('page.variance.allMonths')}</option>
              {MONTH_NAMES.slice(1).map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="v-account" className="text-xs font-semibold text-slate-500">{t('page.variance.account')}</label>
            <select
              id="v-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">{t('page.variance.allAccounts')}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="v-site" className="text-xs font-semibold text-slate-500">{t('page.variance.site')}</label>
            <select
              id="v-site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">{t('page.variance.allSites')}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="v-product" className="text-xs font-semibold text-slate-500">{t('page.variance.product')}</label>
            <select
              id="v-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">{t('page.variance.allProducts')}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="v-customer" className="text-xs font-semibold text-slate-500">{t('page.variance.customer')}</label>
            <select
              id="v-customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">{t('page.variance.allCustomers')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder={t('page.variance.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 flex gap-1 items-center"
              onClick={handleExport}
            >
              <Download className="h-3.5 w-3.5" /> {t('common.export')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 flex gap-1 items-center"
              onClick={() => void queryClient.invalidateQueries({ queryKey: queryKeys.variance.all })}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${varianceQuery.isFetching ? 'animate-spin' : ''}`} /> {t('page.variance.refresh')}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {varianceQuery.isLoading ? (
        <LoadingState rows={8} message="Aggregating performance dimensions..." />
      ) : error && !records.length ? (
        <ErrorState
          message={error}
          onRetry={() => void queryClient.invalidateQueries({ queryKey: queryKeys.variance.all })}
        />
      ) : records.length === 0 ? (
        <EmptyState
          title={t('page.variance.noData')}
          description={t('page.variance.noDataDesc')}
        />
      ) : (
        <>
          {/* Background refresh indicator */}
          {varianceQuery.isFetching && !varianceQuery.isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-3 w-3 animate-spin rounded-full border border-emerald-600 border-t-transparent" />
              Refreshing…
            </div>
          )}
          <TableWrapper<VarianceRecord>
            data={records}
            columns={columns}
            keyExtractor={(row, idx) => `${row.account_id}-${row.period_month}-${idx}`}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">{total} variance items computed</p>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={15}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
