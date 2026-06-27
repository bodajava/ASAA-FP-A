'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Printer,
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
import { useToast } from '@/components/ui/toast';

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
  | 'cash-flow-forecast'
  // Costing-specific reports
  | 'costing-breakdown'
  | 'costing-profitability'
  | 'costing-drivers'
  | 'costing-std-actual'
  | 'costing-mfg'
  | 'costing-pack'
  | 'costing-material'
  | 'costing-yield';

const COSTING_REPORT_MAP: Record<string, string> = {
  'costing-breakdown': 'product-cost-breakdown',
  'costing-profitability': 'product-profitability',
  'costing-drivers': 'cost-drivers',
  'costing-std-actual': 'standard-vs-actual',
  'costing-mfg': 'manufacturing-cost',
  'costing-pack': 'packaging-cost',
  'costing-material': 'material-consumption',
  'costing-yield': 'yield-analysis',
};

export default function ReportsPage() {
  const { activeCompanyId } = useAuth();
  const { error: toastError } = useToast();
  const { t, locale } = useI18n();
  const { tReportType } = useTranslateApi();

  // Report Metas
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

  // Costing report metas definition
  const costingReportMetas = useMemo(() => [
    { value: 'costing-breakdown', label: locale === 'ar' ? 'تحليل تكلفة المنتج' : 'Product Cost Breakdown', description: locale === 'ar' ? 'تفاصيل تكاليف المواد والتعبئة والتصنيع للمنتج' : 'Detailed standard and actual costing breakdown by product', category: 'costing', paginated: false },
    { value: 'costing-profitability', label: locale === 'ar' ? 'تحليل ربحية المنتجات' : 'Product Cost Profitability', description: locale === 'ar' ? 'هامش الربح الإجمالي والصافي وإيرادات المنتجات' : 'Executive revenue, COGS, gross margins, and net margins by product', category: 'costing', paginated: false },
    { value: 'costing-drivers', label: locale === 'ar' ? 'تحليل مسببات التكلفة' : 'Cost Driver Analysis', description: locale === 'ar' ? 'العوامل المؤثرة على تغيرات التكلفة وانحرافاتها' : 'Impact percentage of factors driving cost variances', category: 'costing', paginated: false },
    { value: 'costing-std-actual', label: locale === 'ar' ? 'التكلفة القياسية مقابل الفعلية' : 'Standard vs Actual Cost', description: locale === 'ar' ? 'مقارنة التكلفة المخططة القياسية بالتكلفة الفعلية' : 'Comparison of planned standard costs with actual import costs', category: 'costing', paginated: false },
    { value: 'costing-mfg', label: locale === 'ar' ? 'تكاليف التصنيع المباشرة' : 'Manufacturing Cost', description: locale === 'ar' ? 'تكاليف العمالة والكهرباء والخدمات وتوزيع المصنع' : 'Direct labor, utilities, and overhead cost allocation by product', category: 'costing', paginated: false },
    { value: 'costing-pack', label: locale === 'ar' ? 'تكاليف مواد التعبئة' : 'Packaging Cost Analysis', description: locale === 'ar' ? 'تحليل تكلفة العلب والأغطية والملصقات والكرتون' : 'Tin bodies, lids, labels, and cartons cost breakdown', category: 'costing', paginated: false },
    { value: 'costing-material', label: locale === 'ar' ? 'تحليل استهلاك المواد الخام' : 'Material Consumption', description: locale === 'ar' ? 'الكميات المستهلكة من المواد الخام ومتوسط أسعارها' : 'Total quantity consumed and average purchase price of materials', category: 'costing', paginated: false },
    { value: 'costing-yield', label: locale === 'ar' ? 'تحليل كفاءة الإنتاج والفاقد' : 'Yield & Waste Analysis', description: locale === 'ar' ? 'نسبة إنتاجية الوصفة ومعدل الفاقد الفعلي والقياسي' : 'Input vs output yield percentages and wastage analysis', category: 'costing', paginated: false },
  ], [locale]);

  const activeMeta = useMemo(() => {
    return (
      (reportMetas.find((r) => r.value === selectedReport) as any) ||
      costingReportMetas.find((r) => r.value === selectedReport)
    );
  }, [reportMetas, costingReportMetas, selectedReport]);

  // Load dropdown metadata
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
        // Silent failure for metadata
      }
    }
    void loadMeta();
  }, [activeCompanyId]);

  // Fetch Report Data
  const fetchReport = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoading(true);
    setError(null);

    try {
      const isCostingReport = selectedReport in COSTING_REPORT_MAP;
      const params = new URLSearchParams();

      // Format period YYYY-MM for costing reports
      if (isCostingReport) {
        const monthStr = periodMonth ? (Number(periodMonth) < 10 ? `0${periodMonth}` : periodMonth) : '06';
        params.set('period', `${fiscalYear}-${monthStr}`);
      } else {
        if (fiscalYear) params.set('fiscal_year', fiscalYear);
        if (periodMonth) params.set('period_month', periodMonth);
      }

      if (selectedSiteId) params.set('site_id', selectedSiteId);
      if (selectedProductId) params.set('product_id', selectedProductId);
      if (selectedCustomerId) params.set('customer_id', selectedCustomerId);

      let res: any;

      if (isCostingReport) {
        const subPath = COSTING_REPORT_MAP[selectedReport];
        res = await apiGet<unknown>(`/product-costing/reports/${subPath}?${params.toString()}`);
        
        // Costing reports are not paginated at backend, but we can treat them as unpaginated lists
        setReportData(res ?? []);
        setTotal(res?.length ?? 0);
        setTotalPages(1);
      } else {
        const isPaginated = activeMeta?.paginated;
        if (isPaginated) {
          params.set('page', String(page));
          params.set('limit', '10');
        }

        res = await apiGet<unknown>(`/reports/${selectedReport}?${params.toString()}`);

        if (isPaginated) {
          const paginated = res as { data: any[]; total: number; totalPages: number };
          setReportData(paginated.data ?? []);
          setTotal(paginated.total ?? 0);
          setTotalPages(paginated.totalPages ?? 1);
        } else {
          const list = res as any[];
          setReportData(list ?? []);
          setTotal(list?.length ?? 0);
          setTotalPages(1);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('page.reports.fetchFailed');
      setError(msg);
      toastError(msg);
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId, selectedReport, fiscalYear, periodMonth, selectedSiteId, selectedProductId, selectedCustomerId, page, activeMeta, t, toastError]);

  useEffect(() => {
    void Promise.resolve().then(() => void fetchReport());
  }, [fetchReport]);

  // Reset page on report change
  useEffect(() => {
    void Promise.resolve().then(() => setPage(1));
  }, [selectedReport]);

  // Client-side CSV/Excel export utility
  const handleExport = useCallback(() => {
    if (reportData.length === 0) return;
    try {
      const cols = getColumns();
      const headers = cols.map(c => c.header);
      const csvRows = [headers.join(',')];

      reportData.forEach((row, rowIndex) => {
        const values = cols.map(c => {
          const val = row[c.key as string];
          let formattedVal = '';
          if (c.render) {
            const rendered = c.render(val, row, rowIndex);
            formattedVal = typeof rendered === 'object' ? '' : String(rendered ?? '');
          } else {
            formattedVal = String(val ?? '');
          }
          return `"${formattedVal.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${selectedReport}-${new Date().toISOString().substring(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toastError(t('page.reports.exportFailed', { error: err.message }));
    }
  }, [reportData, selectedReport, toastError, t]);

  // Formatting helpers
  function fmtVal(val: unknown) {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return String(val);
  }

  function fmtValDecimal(val: unknown) {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
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

  // Columns definition per report type
  const getColumns = (): Column<any>[] => {
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
          { key: 'account_name', header: 'Account Name', className: 'font-semibold' },
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

      // ============================================================
      // COSTING REPORTS COLUMNS
      // ============================================================
      case 'costing-breakdown':
        return [
          { key: 'sku', header: 'SKU', className: 'font-mono text-slate-500' },
          { key: 'name', header: 'Product Name', className: 'font-semibold' },
          { key: 'rawMaterialCost', header: 'Raw Material', render: fmtValDecimal, className: 'text-right' },
          { key: 'packagingCost', header: 'Packaging', render: fmtValDecimal, className: 'text-right' },
          { key: 'laborCost', header: 'Labor', render: fmtValDecimal, className: 'text-right' },
          { key: 'utilitiesCost', header: 'Utilities', render: fmtValDecimal, className: 'text-right' },
          { key: 'overheadCost', header: 'Overhead', render: fmtValDecimal, className: 'text-right' },
          { key: 'freightCost', header: 'Freight', render: fmtValDecimal, className: 'text-right' },
          { key: 'sellingCost', header: 'Selling', render: fmtValDecimal, className: 'text-right' },
          { key: 'totalCost', header: 'Total Cost', render: fmtValDecimal, className: 'text-right font-bold text-emerald-800' },
          { key: 'sellingPrice', header: 'Sale Price', render: fmtValDecimal, className: 'text-right text-slate-500' },
          { key: 'grossMarginPct', header: 'Margin %', render: fmtPct, className: 'text-right font-bold' },
        ];
      case 'costing-profitability':
        return [
          { key: 'sku', header: 'SKU', className: 'font-mono text-slate-500' },
          { key: 'name', header: 'Product Name', className: 'font-semibold' },
          { key: 'revenue', header: 'Revenue', render: fmtVal, className: 'text-right font-bold' },
          { key: 'quantitySold', header: 'Qty Sold', className: 'text-right font-mono' },
          { key: 'standardCost', header: 'Std Cost/Unit', render: fmtValDecimal, className: 'text-right text-slate-500' },
          { key: 'actualCost', header: 'Actual Cost/Unit', render: fmtValDecimal, className: 'text-right text-slate-500' },
          { key: 'grossProfit', header: 'Gross Profit', render: fmtVal, className: 'text-right font-medium' },
          { key: 'grossMarginPct', header: 'Gross Margin %', render: fmtPct, className: 'text-right font-extrabold text-emerald-600' },
          { key: 'netProfit', header: 'Net Profit', render: fmtVal, className: 'text-right font-medium' },
          { key: 'netMarginPct', header: 'Net Margin %', render: fmtPct, className: 'text-right font-extrabold text-emerald-800' },
        ];
      case 'costing-drivers':
        return [
          { key: 'name', header: 'Driver Name', className: 'font-semibold' },
          { key: 'driverType', header: 'Driver Type', className: 'capitalize text-slate-500' },
          {
            key: 'impactPct',
            header: 'Impact %',
            className: 'text-right font-bold',
            render: (v) => {
              const num = Number(v);
              return (
                <span className={num > 0 ? 'text-red-600' : num < 0 ? 'text-emerald-600' : 'text-slate-500'}>
                  {num > 0 ? '+' : ''}{fmtPct(num)}
                </span>
              );
            }
          },
          { key: 'description', header: 'Description', className: 'text-xs text-slate-500 max-w-sm' },
        ];
      case 'costing-std-actual':
        return [
          { key: 'sku', header: 'SKU', className: 'font-mono text-slate-500' },
          { key: 'name', header: 'Product Name', className: 'font-semibold' },
          { key: 'standardCost', header: 'Std Cost/Unit', render: fmtValDecimal, className: 'text-right' },
          { key: 'actualCost', header: 'Actual Cost/Unit', render: fmtValDecimal, className: 'text-right font-semibold text-blue-700' },
          {
            key: 'variance',
            header: 'Variance',
            className: 'text-right font-bold',
            render: (v) => {
              const num = Number(v);
              return (
                <span className={num > 0 ? 'text-red-600 font-bold' : num < 0 ? 'text-emerald-600' : 'text-slate-500'}>
                  {num > 0 ? '+' : ''}{fmtValDecimal(num)}
                </span>
              );
            }
          },
          {
            key: 'variancePct',
            header: 'Variance %',
            className: 'text-right font-bold',
            render: (v) => {
              const num = Number(v);
              return (
                <span className={num > 0 ? 'text-red-600' : num < 0 ? 'text-emerald-600' : 'text-slate-500'}>
                  {num > 0 ? '+' : ''}{fmtPct(num)}
                </span>
              );
            }
          },
          { key: 'reason', header: 'Variance Cause Tracing', className: 'text-xs text-slate-500 font-medium' },
        ];
      case 'costing-mfg':
        return [
          { key: 'sku', header: 'SKU', className: 'font-mono text-slate-500' },
          { key: 'name', header: 'Product Name', className: 'font-semibold' },
          { key: 'laborCost', header: 'Labor Cost', render: fmtValDecimal, className: 'text-right' },
          { key: 'utilitiesCost', header: 'Utilities Cost', render: fmtValDecimal, className: 'text-right' },
          { key: 'overheadCost', header: 'Manufacturing Overhead', render: fmtValDecimal, className: 'text-right' },
          { key: 'totalMfgCost', header: 'Total Mfg Cost', render: fmtValDecimal, className: 'text-right font-bold text-slate-900' },
          { key: 'productionQty', header: 'Qty Produced', className: 'text-right font-mono' },
        ];
      case 'costing-pack':
        return [
          { key: 'sku', header: 'SKU', className: 'font-mono text-slate-500' },
          { key: 'name', header: 'Product Name', className: 'font-semibold' },
          { key: 'canBodyCost', header: 'Can Body', render: fmtValDecimal, className: 'text-right' },
          { key: 'lidCost', header: 'Easy Lid', render: fmtValDecimal, className: 'text-right' },
          { key: 'labelCost', header: 'Label', render: fmtValDecimal, className: 'text-right' },
          { key: 'cartonCost', header: 'Carton', render: fmtValDecimal, className: 'text-right' },
          { key: 'totalPackagingCost', header: 'Total Packaging Cost', render: fmtValDecimal, className: 'text-right font-bold text-emerald-800' },
        ];
      case 'costing-material':
        return [
          { key: 'code', header: 'Material Code', className: 'font-mono text-slate-500' },
          { key: 'name', header: 'Material Name', className: 'font-semibold' },
          { key: 'unit', header: 'Unit', className: 'text-slate-500 text-center' },
          { key: 'consumedQty', header: 'Consumed Qty', className: 'text-right font-mono font-medium', render: (v) => v !== null && v !== undefined ? Number(v).toLocaleString() : '0' },
          { key: 'averagePrice', header: 'Avg Price/Unit', render: fmtVal, className: 'text-right' },
          { key: 'totalSpend', header: 'Total Spend', render: fmtVal, className: 'text-right font-bold' },
        ];
      case 'costing-yield':
        return [
          { key: 'sku', header: 'SKU', className: 'font-mono text-slate-500' },
          { key: 'name', header: 'Product Name', className: 'font-semibold' },
          { key: 'inputQty', header: 'Input Qty', className: 'text-right font-mono', render: (v) => v !== null && v !== undefined ? Number(v).toLocaleString() : '0' },
          { key: 'outputQty', header: 'Output Qty', className: 'text-right font-mono', render: (v) => v !== null && v !== undefined ? Number(v).toLocaleString() : '0' },
          { key: 'wasteQty', header: 'Waste Qty', className: 'text-right font-mono text-red-500', render: (v) => v !== null && v !== undefined ? Number(v).toLocaleString() : '0' },
          {
            key: 'yieldPct',
            header: 'Yield %',
            className: 'text-right font-bold',
            render: (v) => {
              const num = Number(v);
              return <span className={num >= 95 ? 'text-emerald-600' : num >= 85 ? 'text-amber-600' : 'text-red-500'}>{fmtPct(num)}</span>;
            }
          },
          {
            key: 'wastePct',
            header: 'Waste %',
            className: 'text-right font-bold',
            render: (v) => {
              const num = Number(v);
              return <span className={num <= 5 ? 'text-emerald-600' : num <= 15 ? 'text-amber-600' : 'text-red-500'}>{fmtPct(num)}</span>;
            }
          },
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
    <div className="space-y-6 print:p-0 print:space-y-0">
      <div className="print:hidden">
        <PageHeader
          title={t('page.reports.title')}
          description={t('page.reports.description')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:grid-cols-1">
        {/* Left Sidebar - Report Type Selector */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-fit space-y-4 print:hidden">
          {/* Financial statements */}
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

          {/* Costing specific section */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
              {locale === 'ar' ? 'تكاليف المنتجات والربحية' : 'Product Costing & Margins'}
            </h3>
            <ul className="space-y-0.5" role="menu">
              {costingReportMetas.map((r) => (
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
                    <Activity className="h-3.5 w-3.5" /> {r.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Performance and operational variances */}
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
        <div className="lg:col-span-3 space-y-6 print:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 print:border-none print:shadow-none print:p-0">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{activeMeta?.label ?? tReportType(selectedReport)}</h2>
              <p className="text-xs text-slate-500 mt-0.5 print:hidden">{activeMeta?.description}</p>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 print:hidden dark:bg-slate-900/50 dark:border-slate-800">
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
                  className="h-8 rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-month" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('page.reports.filterMonth')}</label>
                <select
                  id="filter-month"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                  className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                  className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                  className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 print:hidden dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500">
                {t('page.reports.recordsRetrieved', { n: total })}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExport} className="flex items-center gap-1">
                  <Download className="h-3.5 w-3.5" /> {t('page.reports.exportCsv')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.print()} className="flex items-center gap-1">
                  <Printer className="h-3.5 w-3.5" /> {locale === 'ar' ? 'طباعة PDF' : 'Print PDF'}
                </Button>
                <Button size="sm" variant="outline" onClick={fetchReport} className="flex items-center gap-1">
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> {t('page.reports.refresh')}
                </Button>
              </div>
            </div>

            {/* Data Table */}
            {isLoading ? (
              <div className="print:hidden">
                <LoadingState rows={8} message={t('common.loading')} />
              </div>
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

                {!COSTING_REPORT_MAP[selectedReport] && activeMeta?.paginated && totalPages > 1 && (
                  <div className="print:hidden">
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      total={total}
                      limit={10}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
