'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/feedback-states';
import { useAuth } from '@/lib/auth-context';
import { apiGet } from '@/lib/api';
import type {
  VarianceRecord,
  Account,
  Site,
  Product,
  Customer,
  PaginatedResponse,
} from '@/types/api';

import { useToast } from '@/components/ui/toast';

type CompareType = 'budget-vs-actual' | 'budget-vs-forecast' | 'actual-vs-forecast' | 'budget-actual-forecast';

export default function VariancePage() {
  const { activeCompanyId } = useAuth();
  const { error: toastError } = useToast();

  // Comparison Tab
  const [compareType, setCompareType] = useState<CompareType>('budget-vs-actual');

  // Filters State
  const [fiscalYear, setFiscalYear] = useState('2025');
  const [periodMonth, setPeriodMonth] = useState('');
  const [accountId, setAccountId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [productId, setProductId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');

  // Paginated List State
  const [records, setRecords] = useState<VarianceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Master Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // ---------------------------------------------------------------------------
  // Load Master Data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeCompanyId) return;
    async function loadFiltersData() {
      try {
        const [accs, sts, prds, custs] = await Promise.all([
          apiGet<PaginatedResponse<Account>>('/accounts?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Site>>('/sites?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Product>>('/products?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Customer>>('/customers?limit=1000').then((r) => r.data),
        ]);
        setAccounts(accs);
        setSites(sts);
        setProducts(prds);
        setCustomers(custs);
      } catch {
        // Handle silently
      }
    }
    void loadFiltersData();
  }, [activeCompanyId]);

  // ---------------------------------------------------------------------------
  // Load Variance Report Data
  // ---------------------------------------------------------------------------
  const fetchVarianceReport = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (fiscalYear) params.set('fiscal_year', fiscalYear);
      if (periodMonth) params.set('period_month', periodMonth);
      if (accountId) params.set('account_id', accountId);
      if (siteId) params.set('site_id', siteId);
      if (productId) params.set('product_id', productId);
      if (customerId) params.set('customer_id', customerId);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiGet<PaginatedResponse<VarianceRecord>>(`/variance/${compareType}?${params.toString()}`);
      setRecords(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve variance data.';
      setError(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId, compareType, page, fiscalYear, periodMonth, accountId, siteId, productId, customerId, search]);

  useEffect(() => {
    void Promise.resolve().then(() => void fetchVarianceReport());
  }, [fetchVarianceReport]);

  // Reset page on filter/tab changes
  useEffect(() => {
    void Promise.resolve().then(() => setPage(1));
  }, [compareType, fiscalYear, periodMonth, accountId, siteId, productId, customerId]);

  // ---------------------------------------------------------------------------
  // Color-Coding Helpers based on Account Type & Variance Direction
  // ---------------------------------------------------------------------------
  function renderVariance(amount: number, percentage: number | null, accId: string) {
    if (amount === 0) {
      return <span className="text-slate-400 font-mono">—</span>;
    }

    const acc = accounts.find((a) => a.id === accId);
    const accType = acc?.accountType ?? 'expense';

    // Decide if positive variance is favorable or unfavorable.
    // For revenue and assets, positive variance is favorable (actual > budget).
    // For expense, liabilities, and equity, positive variance is unfavorable (actual > budget).
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
  const columns: Column<VarianceRecord>[] = [
    {
      key: 'account_id',
      header: 'Account',
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
      header: 'Period',
      render: (v, row) => `FY${row.fiscal_year} M${String(v)}`,
    },
    {
      key: 'site_id',
      header: 'Site',
      render: (v) => sites.find((s) => s.id === String(v))?.name ?? '—',
    },
    {
      key: 'product_id',
      header: 'Product/Customer',
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

  // Dynamically append comparison columns
  if (compareType === 'budget-vs-actual') {
    columns.push(
      { key: 'budget_amount', header: 'Budget', className: 'text-right font-mono text-xs', render: (v) => `$${Number(v).toLocaleString()}` },
      { key: 'actual_amount', header: 'Actual', className: 'text-right font-mono text-xs font-semibold', render: (v) => `$${Number(v).toLocaleString()}` },
      {
        key: 'variance_amount',
        header: 'Variance (Actual - Budget)',
        className: 'text-right',
        render: (_, row) => renderVariance(row.variance_amount, row.variance_pct, row.account_id),
      }
    );
  } else if (compareType === 'budget-vs-forecast') {
    columns.push(
      { key: 'budget_amount', header: 'Budget', className: 'text-right font-mono text-xs', render: (v) => `$${Number(v).toLocaleString()}` },
      { key: 'forecast_amount', header: 'Forecast', className: 'text-right font-mono text-xs font-semibold', render: (v) => `$${Number(v).toLocaleString()}` },
      {
        key: 'variance_amount',
        header: 'Variance (Forecast - Budget)',
        className: 'text-right',
        render: (_, row) => renderVariance(row.variance_amount, row.variance_pct, row.account_id),
      }
    );
  } else if (compareType === 'actual-vs-forecast') {
    columns.push(
      { key: 'actual_amount', header: 'Actual', className: 'text-right font-mono text-xs', render: (v) => `$${Number(v).toLocaleString()}` },
      { key: 'forecast_amount', header: 'Forecast', className: 'text-right font-mono text-xs font-semibold', render: (v) => `$${Number(v).toLocaleString()}` },
      {
        key: 'variance_amount',
        header: 'Variance (Forecast - Actual)',
        className: 'text-right',
        render: (_, row) => renderVariance(row.variance_amount, row.variance_pct, row.account_id),
      }
    );
  } else {
    // Three-way
    columns.push(
      { key: 'budget_amount', header: 'Budget', className: 'text-right font-mono text-xs text-slate-500', render: (v) => `$${Number(v).toLocaleString()}` },
      { key: 'actual_amount', header: 'Actual', className: 'text-right font-mono text-xs text-slate-700', render: (v) => `$${Number(v).toLocaleString()}` },
      { key: 'forecast_amount', header: 'Forecast', className: 'text-right font-mono text-xs text-slate-700 border-r border-slate-100', render: (v) => `$${Number(v).toLocaleString()}` },
      {
        key: 'actual_vs_budget_amount',
        header: 'Act vs Bud',
        className: 'text-right',
        render: (_, row) => renderVariance(row.actual_vs_budget_amount ?? 0, row.actual_vs_budget_pct ?? null, row.account_id),
      },
      {
        key: 'forecast_vs_budget_amount',
        header: 'For vs Bud',
        className: 'text-right',
        render: (_, row) => renderVariance(row.forecast_vs_budget_amount ?? 0, row.forecast_vs_budget_pct ?? null, row.account_id),
      },
      {
        key: 'forecast_vs_actual_amount',
        header: 'For vs Act',
        className: 'text-right',
        render: (_, row) => renderVariance(row.forecast_vs_actual_amount ?? 0, row.forecast_vs_actual_pct ?? null, row.account_id),
      }
    );
  }

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Variance Analysis" description="Compare financial performance across budget, forecast, and actual dimensions." />
        <ErrorState
          title="No active company"
          message="Please select a company from the sidebar before viewing variance analysis."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Variance Analysis" description="Measure performance metrics and analyze budget compliance." />

      {/* Tabs for comparison modes */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {(
          [
            { value: 'budget-vs-actual', label: 'Budget vs Actual' },
            { value: 'budget-vs-forecast', label: 'Budget vs Forecast' },
            { value: 'actual-vs-forecast', label: 'Actual vs Forecast' },
            { value: 'budget-actual-forecast', label: 'Three-Way (B vs A vs F)' },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            onClick={() => setCompareType(t.value)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors duration-150 ${
              compareType === t.value
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
          <Filter className="h-4.5 w-4.5 text-emerald-600" /> Filter Analysis
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Input
            id="v-year"
            label="Fiscal Year"
            type="number"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            placeholder="2026"
            className="h-8 py-1.5 text-xs"
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="v-month" className="text-xs font-semibold text-slate-500">Period Month</label>
            <select
              id="v-month"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>Month {m}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="v-account" className="text-xs font-semibold text-slate-500">Account</label>
            <select
              id="v-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="v-site" className="text-xs font-semibold text-slate-500">Site</label>
            <select
              id="v-site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="v-product" className="text-xs font-semibold text-slate-500">Product</label>
            <select
              id="v-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="v-customer" className="text-xs font-semibold text-slate-500">Customer</label>
            <select
              id="v-customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Global search within filtered variance records */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search table..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 px-3 ml-auto flex gap-1 items-center" onClick={fetchVarianceReport}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <LoadingState rows={8} message="Aggregating performance dimensions..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchVarianceReport} />
      ) : records.length === 0 ? (
        <EmptyState
          title="No variance data found"
          description="Try broadening your filter parameters or import actuals/create budgets."
        />
      ) : (
        <>
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
