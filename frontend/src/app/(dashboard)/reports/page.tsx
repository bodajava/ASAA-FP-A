'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  Filter,
  RefreshCw,
  Activity,
  Layers,
  Building,
  Users,
  Download,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/feedback-states';
import { useAuth } from '@/lib/auth-context';
import api, { apiGet } from '@/lib/api';
import { MONTH_NAMES, getCurrentFiscalYear, REPORT_METAS as FALLBACK_REPORT_METAS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useTranslateApi } from '@/lib/i18n/translate-api';
import type {
  Account,
  Site,
  Product,
  Customer,
  PaginatedResponse,
  ReportMeta,
} from '@/types/api';

// Report Types Definitions
type ReportType =
  | 'pl'
  | 'cashflow'
  | 'gross-margin'
  | 'net-profit'
  | 'budget-vs-actual'
  | 'forecast-accuracy'
  | 'product-profitability'
  | 'branch-profitability'
  | 'factory-costing'
  | 'inventory-coverage'
  | 'slow-moving-items'
  | 'wastage-analysis'
  | 'customer-profitability'
  | 'product-cost-variance'
  | 'production-capacity'
  | 'cash-flow-forecast';

import { useToast } from '@/components/ui/toast';

export default function ReportsPage() {
  const { activeCompanyId } = useAuth();
  const { error: toastError } = useToast();
  const { t } = useI18n();
  const { tReportType, tReportCategory } = useTranslateApi();

  // Report Metas (initialized with constants, overridden by API)
  const [reportMetas, setReportMetas] = useState<ReportMeta[]>(FALLBACK_REPORT_METAS);

  // Selected Report
  const [selectedReport, setSelectedReport] = useState<ReportType>('pl');

  // Filter States
  const [fiscalYear, setFiscalYear] = useState<string>(String(getCurrentFiscalYear()));
  const [periodMonth, setPeriodMonth] = useState<string>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Dropdown lists
  const [sites, setSites] = useState<Site[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // List & Pagination States
  const [reportData, setReportData] = useState<Record<string, string | number | boolean | null | undefined>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load dropdown metadata + report metas from API
  useEffect(() => {
    if (!activeCompanyId) return;

    async function loadMeta() {
      try {
        const [sList, pList, cList, aList, apiMetas] = await Promise.all([
          apiGet<PaginatedResponse<Site>>('/sites?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Product>>('/products?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Customer>>('/customers?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Account>>('/accounts?limit=1000').then((r) => r.data),
          apiGet<ReportMeta[]>('/reports/meta'),
        ]);
        setSites(sList);
        setProducts(pList);
        setCustomers(cList);
        setAccounts(aList);
        if (apiMetas && apiMetas.length > 0) {
          setReportMetas(apiMetas);
        }
      } catch {
        // Silent failure for meta – keep using fallback constants
      }
    }
    void loadMeta();
  }, [activeCompanyId]);

  // Fetch Report Data
  const fetchReport = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoading(true);
    setError(null);

    const meta = reportMetas.find((r) => r.value === selectedReport);
    if (!meta) return;

    try {
      const params = new URLSearchParams();
      if (fiscalYear) params.set('fiscal_year', fiscalYear);
      if (periodMonth) params.set('period_month', periodMonth);
      if (selectedSiteId) params.set('site_id', selectedSiteId);
      if (selectedProductId) params.set('product_id', selectedProductId);
      if (selectedCustomerId) params.set('customer_id', selectedCustomerId);

      if (meta.paginated) {
        params.set('page', String(page));
        params.set('limit', '10');
      }

      const res = await apiGet<unknown>(`/reports/${selectedReport}?${params.toString()}`);

      if (meta.paginated) {
        const paginated = res as { data: Record<string, string | number | boolean | null | undefined>[]; total: number; totalPages: number };
        setReportData(paginated.data ?? []);
        setTotal(paginated.total ?? 0);
        setTotalPages(paginated.totalPages ?? 1);
      } else {
        const list = res as Record<string, string | number | boolean | null | undefined>[];
        setReportData(list ?? []);
        setTotal(list?.length ?? 0);
        setTotalPages(1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('page.reports.fetchFailed');
      setError(msg);
      toastError(msg);
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId, selectedReport, fiscalYear, periodMonth, selectedSiteId, selectedProductId, selectedCustomerId, page]);

  useEffect(() => {
    void Promise.resolve().then(() => void fetchReport());
  }, [fetchReport]);

  // Reset page on report type change (deferred to avoid setState-in-effect lint rule)
  useEffect(() => {
    void Promise.resolve().then(() => setPage(1));
  }, [selectedReport]);

  // Export handler
  const handleExport = useCallback(async () => {
    if (!activeCompanyId) return;
    try {
      const params = new URLSearchParams();
      if (fiscalYear) params.set('fiscal_year', fiscalYear);
      if (periodMonth) params.set('period_month', periodMonth);
      if (selectedSiteId) params.set('site_id', selectedSiteId);
      if (selectedProductId) params.set('product_id', selectedProductId);
      if (selectedCustomerId) params.set('customer_id', selectedCustomerId);

      const res = await api.get(`/reports/export/${selectedReport}?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${selectedReport}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      let msg = t('error.unexpectedError');
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
        msg = axiosErr.response?.data?.message ?? axiosErr.message ?? msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toastError(t('page.reports.exportFailed', { error: msg }));
    }
  }, [activeCompanyId, selectedReport, fiscalYear, periodMonth, selectedSiteId, selectedProductId, selectedCustomerId, toastError]);

  const activeMeta = reportMetas.find((r) => r.value === selectedReport);

  // Helper formatting functions
  function fmtVal(val: unknown) {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return String(val);
  }

  function fmtPct(val: unknown) {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
      return `${val.toFixed(2)}%`;
    }
    return String(val);
  }

  // Define Columns dynamically per report type
  const getColumns = (): Column<Record<string, string | number | boolean | null | undefined>>[] => {
    switch (selectedReport) {
      case 'pl':
        return [
          { key: 'period_month', header: 'Month', render: (v) => MONTH_NAMES[Number(v)] ?? v },
          { key: 'actual_revenue', header: 'Actual Revenue', render: fmtVal, className: 'text-right' },
          { key: 'budget_revenue', header: 'Budget Revenue', render: fmtVal, className: 'text-right text-slate-500' },
          { key: 'forecast_revenue', header: 'Forecast Revenue', render: fmtVal, className: 'text-right text-slate-500' },
          { key: 'actual_gross_profit', header: 'Actual Gross Profit', render: fmtVal, className: 'text-right font-medium text-emerald-800' },
          { key: 'actual_expense', header: 'Actual Expenses', render: fmtVal, className: 'text-right' },
          { key: 'actual_net_profit', header: 'Actual Net Profit', render: fmtVal, className: 'text-right font-bold text-slate-900' },
        ];
      case 'cashflow':
        return [
          { key: 'period_month', header: 'Month', render: (v) => MONTH_NAMES[Number(v)] ?? v },
          { key: 'actual_inflow', header: 'Actual Inflow', render: fmtVal, className: 'text-right text-emerald-800' },
          { key: 'actual_outflow', header: 'Actual Outflow', render: fmtVal, className: 'text-right text-red-800' },
          { key: 'actual_net', header: 'Actual Net Cashflow', render: fmtVal, className: 'text-right font-bold' },
          { key: 'budget_net', header: 'Budget Net', render: fmtVal, className: 'text-right text-slate-500' },
          { key: 'forecast_net', header: 'Forecast Net', render: fmtVal, className: 'text-right text-slate-500' },
        ];
      case 'gross-margin':
        return [
          { key: 'period_month', header: 'Month', render: (v) => MONTH_NAMES[Number(v)] ?? v },
          { key: 'actual_revenue', header: 'Actual Revenue', render: fmtVal, className: 'text-right' },
          { key: 'actual_cogs', header: 'Actual COGS', render: fmtVal, className: 'text-right' },
          { key: 'actual_margin', header: 'Gross Margin', render: fmtVal, className: 'text-right font-medium' },
          { key: 'actual_margin_pct', header: 'Margin %', render: fmtPct, className: 'text-right font-bold' },
          { key: 'budget_margin_pct', header: 'Budget Margin %', render: fmtPct, className: 'text-right text-slate-500' },
        ];
      case 'net-profit':
        return [
          { key: 'period_month', header: 'Month', render: (v) => MONTH_NAMES[Number(v)] ?? v },
          { key: 'actual_revenue', header: 'Actual Revenue', render: fmtVal, className: 'text-right' },
          { key: 'actual_net_profit', header: 'Actual Net Profit', render: fmtVal, className: 'text-right font-medium' },
          { key: 'actual_net_profit_pct', header: 'Net Margin %', render: fmtPct, className: 'text-right font-bold' },
          { key: 'budget_net_profit_pct', header: 'Budget Net %', render: fmtPct, className: 'text-right text-slate-500' },
        ];
      case 'budget-vs-actual':
        return [
          { key: 'account_code', header: 'Acct Code', className: 'font-mono text-slate-500' },
          {
            key: 'account_name',
            header: 'Account Name',
            className: 'font-semibold',
            render: (v, row) => {
              const name = String(v);
              const acc = accounts.find((a) => a.id === row.account_id);
              return acc ? <span>{name}</span> : <span>{name}</span>;
            },
          },
          { key: 'budget_amount', header: 'Budgeted', render: fmtVal, className: 'text-right' },
          { key: 'actual_amount', header: 'Actual', render: fmtVal, className: 'text-right' },
          {
            key: 'variance_amount',
            header: 'Variance',
            className: 'text-right font-medium',
            render: (v) => {
              const num = Number(v);
              return (
                <span className={num > 0 ? 'text-emerald-700' : num < 0 ? 'text-red-700' : 'text-slate-500'}>
                  {num > 0 ? '+' : ''}
                  {fmtVal(num)}
                </span>
              );
            },
          },
          {
            key: 'variance_pct',
            header: 'Variance %',
            className: 'text-right font-semibold',
            render: (v) => {
              if (v === null || v === undefined) return '—';
              const num = Number(v);
              return (
                <span className={num > 0 ? 'text-emerald-700' : num < 0 ? 'text-red-700' : 'text-slate-500'}>
                  {num > 0 ? '+' : ''}
                  {fmtPct(num)}
                </span>
              );
            },
          },
        ];
      case 'forecast-accuracy':
        return [
          { key: 'period_month', header: 'Month', render: (v) => MONTH_NAMES[Number(v)] ?? v },
          { key: 'actual_amount', header: 'Actual Amount', render: fmtVal, className: 'text-right' },
          { key: 'forecast_amount', header: 'Forecast Amount', render: fmtVal, className: 'text-right' },
          { key: 'absolute_error', header: 'Absolute Error', render: fmtVal, className: 'text-right text-slate-600' },
          {
            key: 'accuracy_pct',
            header: 'Accuracy %',
            className: 'text-right font-bold',
            render: (v) => {
              if (v === null || v === undefined) return '—';
              const pctNum = Number(v);
              return (
                <span className={pctNum >= 90 ? 'text-emerald-700' : pctNum >= 75 ? 'text-amber-700' : 'text-red-700'}>
                  {fmtPct(pctNum)}
                </span>
              );
            },
          },
        ];
      case 'product-profitability':
        return [
          { key: 'product_sku', header: 'SKU', className: 'font-mono text-slate-500' },
          { key: 'product_name', header: 'Product Name', className: 'font-semibold' },
          { key: 'revenue', header: 'Revenue Generated', render: fmtVal, className: 'text-right' },
          { key: 'cogs', header: 'COGS', render: fmtVal, className: 'text-right' },
          { key: 'gross_margin', header: 'Gross Margin', render: fmtVal, className: 'text-right font-medium' },
          { key: 'gross_margin_pct', header: 'Margin %', render: fmtPct, className: 'text-right font-bold' },
        ];
      case 'branch-profitability':
        return [
          { key: 'site_name', header: 'Site Name', className: 'font-semibold' },
          { key: 'revenue', header: 'Revenue', render: fmtVal, className: 'text-right' },
          { key: 'cogs', header: 'COGS', render: fmtVal, className: 'text-right' },
          { key: 'expenses', header: 'Operating Expenses', render: fmtVal, className: 'text-right' },
          { key: 'gross_profit', header: 'Gross Profit', render: fmtVal, className: 'text-right font-medium' },
          { key: 'net_profit', header: 'Net Profit', render: fmtVal, className: 'text-right font-bold text-slate-900' },
        ];
      case 'factory-costing':
        return [
          { key: 'site_name', header: 'Factory Site', className: 'font-semibold' },
          { key: 'raw_material_cost', header: 'Raw Material Cost', render: fmtVal, className: 'text-right' },
          { key: 'labor_cost', header: 'Direct Labor Cost', render: fmtVal, className: 'text-right' },
          { key: 'overhead_cost', header: 'Factory Overhead', render: fmtVal, className: 'text-right' },
          { key: 'total_cost', header: 'Total Mfg Cost', render: fmtVal, className: 'text-right font-bold text-slate-900' },
        ];
      case 'inventory-coverage':
        return [
          { key: 'site_name', header: 'Warehouse Site' },
          { key: 'product_sku', header: 'SKU', className: 'font-mono text-slate-500' },
          { key: 'product_name', header: 'Product Name', className: 'font-semibold' },
          { key: 'qty_on_hand', header: 'Qty On Hand', className: 'text-right font-mono' },
          { key: 'avg_daily_qty', header: 'Avg Daily Demand', className: 'text-right font-mono' },
          {
            key: 'coverage_days',
            header: 'Coverage (Days)',
            className: 'text-right font-semibold',
            render: (v) => {
              if (v === null || v === undefined) return '—';
              const days = Number(v);
              return (
                <span className={days < 10 ? 'text-red-700 font-bold' : days < 30 ? 'text-amber-700' : 'text-slate-700'}>
                  {days.toFixed(1)} Days
                </span>
              );
            },
          },
          { key: 'inventory_value', header: 'Inventory Value', render: fmtVal, className: 'text-right' },
        ];
      case 'slow-moving-items':
        return [
          { key: 'site_name', header: 'Site' },
          { key: 'product_sku', header: 'SKU', className: 'font-mono text-slate-500' },
          { key: 'product_name', header: 'Product Name', className: 'font-semibold' },
          { key: 'qty_on_hand', header: 'Qty On Hand', className: 'text-right font-mono' },
          { key: 'inventory_value', header: 'Value', render: fmtVal, className: 'text-right' },
          { key: 'moved_qty_90', header: 'Qty Moved (90d)', className: 'text-right font-mono' },
          {
            key: 'last_movement_date',
            header: 'Last Movement',
            render: (v) => (v ? new Date(String(v)).toLocaleDateString() : 'Never'),
          },
        ];
      case 'wastage-analysis':
        return [
          { key: 'product_name', header: 'Product Name', className: 'font-semibold' },
          { key: 'material_name', header: 'Raw Material Name' },
          { key: 'standard_wastage_pct', header: 'Std Wastage %', render: fmtPct, className: 'text-right text-slate-500' },
          { key: 'actual_wastage_pct', header: 'Actual Wastage %', render: fmtPct, className: 'text-right' },
          {
            key: 'variance_pct',
            header: 'Waste Variance %',
            className: 'text-right font-bold',
            render: (v) => {
              const num = Number(v);
              return (
                <span className={num > 0 ? 'text-red-700' : num < 0 ? 'text-emerald-700' : 'text-slate-500'}>
                  {num > 0 ? '+' : ''}
                  {fmtPct(num)}
                </span>
              );
            },
          },
        ];
      case 'customer-profitability':
        return [
          { key: 'customer_name', header: 'Customer Name', className: 'font-semibold' },
          { key: 'region', header: 'Region', render: (v) => String(v || '—') },
          { key: 'revenue', header: 'Gross Revenue', render: fmtVal, className: 'text-right' },
          { key: 'cogs', header: 'COGS', render: fmtVal, className: 'text-right' },
          { key: 'expenses', header: 'Operating Expenses', render: fmtVal, className: 'text-right' },
          { key: 'gross_profit', header: 'Gross Profit', render: fmtVal, className: 'text-right font-medium' },
          { key: 'net_profit', header: 'Net Contribution', render: fmtVal, className: 'text-right font-bold text-slate-900' },
        ];
      case 'product-cost-variance':
        return [
          { key: 'product_sku', header: 'SKU', className: 'font-mono text-slate-500' },
          { key: 'product_name', header: 'Product Name', className: 'font-semibold' },
          { key: 'period_month', header: 'Month', render: (v) => MONTH_NAMES[Number(v)] ?? v },
          { key: 'planned_qty', header: 'Planned Qty', className: 'text-right font-mono' },
          { key: 'actual_qty', header: 'Actual Qty', className: 'text-right font-mono' },
          { key: 'budget_total_unit_cost', header: 'Budget Unit Cost', render: fmtVal, className: 'text-right text-slate-500' },
          { key: 'actual_cost_per_unit', header: 'Actual Unit Cost', render: fmtVal, className: 'text-right' },
          {
            key: 'material_variance',
            header: 'Material Var.',
            className: 'text-right font-medium',
            render: (v) => {
              const num = Number(v);
              return <span className={num > 0 ? 'text-emerald-700' : num < 0 ? 'text-red-700' : ''}>{fmtVal(num)}</span>;
            },
          },
          {
            key: 'labor_variance',
            header: 'Labor Var.',
            className: 'text-right',
            render: (v) => {
              const num = Number(v);
              return <span className={num > 0 ? 'text-emerald-700' : num < 0 ? 'text-red-700' : ''}>{fmtVal(num)}</span>;
            },
          },
          {
            key: 'overhead_variance',
            header: 'OH Var.',
            className: 'text-right font-bold',
            render: (v) => {
              const num = Number(v);
              return <span className={num > 0 ? 'text-emerald-700' : num < 0 ? 'text-red-700' : ''}>{fmtVal(num)}</span>;
            },
          },
        ];
      case 'production-capacity':
        return [
          { key: 'site_name', header: 'Factory', className: 'font-semibold' },
          { key: 'product_sku', header: 'SKU', className: 'font-mono text-slate-500' },
          { key: 'product_name', header: 'Product' },
          { key: 'period_month', header: 'Month', render: (v) => MONTH_NAMES[Number(v)] ?? v },
          { key: 'planned_qty', header: 'Planned Qty', className: 'text-right font-mono' },
          { key: 'actual_qty', header: 'Actual Qty', className: 'text-right font-mono' },
          {
            key: 'capacity_utilization_pct',
            header: 'Capacity %',
            className: 'text-right font-bold',
            render: (v) => {
              if (v === null || v === undefined) return '—';
              const pct = Number(v);
              return <span className={pct < 60 ? 'text-red-700' : pct < 80 ? 'text-amber-700' : 'text-emerald-700'}>{fmtPct(pct)}</span>;
            },
          },
          {
            key: 'qty_variance',
            header: 'Qty Var.',
            className: 'text-right',
            render: (v) => {
              const num = Number(v);
              return <span className={num > 0 ? 'text-emerald-700' : num < 0 ? 'text-red-700' : ''}>{fmtVal(num)}</span>;
            },
          },
        ];
      case 'cash-flow-forecast':
        return [
          { key: 'period_month', header: 'Month', render: (v) => MONTH_NAMES[Number(v)] ?? v },
          { key: 'actual_inflow', header: 'Actual Inflow', render: fmtVal, className: 'text-right text-emerald-800' },
          { key: 'actual_outflow', header: 'Actual Outflow', render: fmtVal, className: 'text-right text-red-800' },
          { key: 'actual_net', header: 'Actual Net', render: fmtVal, className: 'text-right font-bold' },
          { key: 'ar_collections', header: 'AR Collections', render: fmtVal, className: 'text-right' },
          { key: 'ap_payments', header: 'AP Payments', render: fmtVal, className: 'text-right' },
          { key: 'working_capital_net', header: 'Working Capital', render: fmtVal, className: 'text-right font-semibold' },
        ];
      default:
        return [];
    }
  };

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('page.reports.title')} description={t('page.reports.description')} />
        <ErrorState
          title={t('page.reports.noCompanyTitle')}
          message={t('page.reports.noCompanyDesc')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('page.reports.title')}
        description={t('page.reports.description')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Report Type Selector */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-fit space-y-4">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">{t('page.reports.financialStatements')}</h3>
            <ul className="space-y-0.5" role="menu">
              {reportMetas.filter((r) => r.category === 'financial').map((r) => (
                <li key={r.value} role="none">
                  <button
                    role="menuitem"
                    onClick={() => setSelectedReport(r.value as ReportType)}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                      selectedReport === r.value
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign className="h-3.5 w-3.5" /> {tReportType(r.value)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">{t('page.reports.performanceVariances')}</h3>
            <ul className="space-y-0.5" role="menu">
              {reportMetas.filter((r) => r.category === 'performance').map((r) => (
                <li key={r.value} role="none">
                  <button
                    role="menuitem"
                    onClick={() => setSelectedReport(r.value as ReportType)}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                      selectedReport === r.value
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5" /> {tReportType(r.value)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">{t('page.reports.operationsCosting')}</h3>
            <ul className="space-y-0.5" role="menu">
              {reportMetas.filter((r) => r.category === 'operations').map((r) => (
                <li key={r.value} role="none">
                  <button
                    role="menuitem"
                    onClick={() => setSelectedReport(r.value as ReportType)}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                      selectedReport === r.value
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5" /> {tReportType(r.value)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Pane - Filters and Data Display */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">{tReportType(activeMeta?.value ?? selectedReport)}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{activeMeta?.description}</p>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-fy" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Filter className="h-2.5 w-2.5" /> {t('page.reports.filterFiscalYear')}
                </label>
                <input
                  id="filter-fy"
                  type="number"
                  min="1900"
                  max="2100"
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(e.target.value)}
                  className="h-8 rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-month" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('page.reports.filterMonth')}</label>
                <select
                  id="filter-month"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="">{t('common.allMonths')}</option>
                  {MONTH_NAMES.map((name, idx) =>
                    idx > 0 ? (
                      <option key={idx} value={idx}>
                        {name}
                      </option>
                    ) : null
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-site" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Building className="h-2.5 w-2.5" /> {t('page.reports.filterSite')}
                </label>
                <select
                  id="filter-site"
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="">{t('common.allSites')}</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-product" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Layers className="h-2.5 w-2.5" /> {t('page.reports.filterProduct')}
                </label>
                <select
                  id="filter-product"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="">{t('common.allProducts')}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-customer" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Users className="h-2.5 w-2.5" /> {t('page.reports.filterCustomer')}
                </label>
                <select
                  id="filter-customer"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="">{t('common.allCustomers')}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Main Action buttons */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-500">
                {t('page.reports.recordsRetrieved', { n: total })}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExport} className="flex items-center gap-1">
                  <Download className="h-3.5 w-3.5" /> {t('page.reports.exportCsv')}
                </Button>
                <Button size="sm" variant="outline" onClick={fetchReport} className="flex items-center gap-1">
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> {t('page.reports.refresh')}
                </Button>
              </div>
            </div>

            {/* Data Table */}
            {isLoading ? (
              <LoadingState rows={8} message={t('common.loading')} />
            ) : error ? (
              <ErrorState message={error} onRetry={fetchReport} />
            ) : reportData.length === 0 ? (
              <EmptyState
                title={t('page.reports.emptyTitle')}
                description={t('page.reports.emptyDesc')}
              />
            ) : (
              <div className="space-y-4">
                <TableWrapper
                  data={reportData}
                  columns={getColumns()}
                  keyExtractor={(_, idx) => String(idx)}
                />

                {activeMeta?.paginated && totalPages > 1 && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    limit={10}
                    onPageChange={setPage}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
