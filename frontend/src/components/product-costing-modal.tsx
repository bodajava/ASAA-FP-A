'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
  Calendar,
  Layers2,
  RefreshCw,
  FolderTree,
  ChevronDown,
  ChevronRight,
  PieChart as PieIcon,
  Clock,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useI18n } from '@/lib/i18n/i18n-context';
import { LoadingState } from './ui/feedback-states';
import { Button } from './ui/button';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

interface CostBreakdown {
  rawMaterialCost: number;
  packagingCost: number;
  manufacturingCost: number;
  laborCost: number;
  utilitiesCost: number;
  overheadCost: number;
  warehouseCost: number;
  freightCost: number;
  sellingCost: number;
  totalCost: number;
  sellingPrice: number;
  grossProfit: number;
  grossMarginPct: number;
  netProfit: number;
  netMarginPct: number;
}

interface ProductCostingDetail {
  productId: string;
  sku: string;
  name: string;
  bomVersion?: string;
  standard: CostBreakdown;
  actual: CostBreakdown;
}

interface SnapshotItem {
  id: string;
  period: string;
  snapshotDate: string;
  standard: CostBreakdown;
  actual: CostBreakdown;
}

interface ProductCostingModalProps {
  productId: string;
  onClose: () => void;
}

export function ProductCostingModal({ productId, onClose }: ProductCostingModalProps) {
  const { t, locale } = useI18n();
  const isRtl = locale === 'ar';
  
  const [period, setPeriod] = useState(() => new Date().toISOString().substring(0, 7)); // e.g. "2026-06"
  const [activeTab, setActiveTab] = useState<'overview' | 'tree' | 'charts' | 'history'>('overview');
  const [data, setData] = useState<ProductCostingDetail | null>(null);
  const [history, setHistory] = useState<SnapshotItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collapsible state for Tree View
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    materials: true,
    packaging: true,
    mfg: true,
    logistics: true,
    selling: true,
  });

  const toggleNode = (node: string) => {
    setExpandedNodes((prev) => ({ ...prev, [node]: !prev[node] }));
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [detailRes, historyRes] = await Promise.all([
        apiGet<ProductCostingDetail>(`/product-costing/products/${productId}/breakdown?period=${period}`),
        apiGet<SnapshotItem[]>(`/product-costing/products/${productId}/snapshots`),
      ]);
      setData(detailRes);
      setHistory(historyRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load product costing details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [productId, period]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await apiPost(`/product-costing/products/${productId}/recalculate?period=${period}`, {});
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Recalculation failed');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Memoize charts data
  const pieChartData = useMemo(() => {
    if (!data) return [];
    const std = data.standard;
    return [
      { name: isRtl ? 'المواد الخام' : 'Raw Materials', value: std.rawMaterialCost, color: '#10b981' },
      { name: isRtl ? 'التعبئة والتغليف' : 'Packaging', value: std.packagingCost, color: '#3b82f6' },
      { name: isRtl ? 'العمالة المباشرة' : 'Direct Labor', value: std.laborCost, color: '#f59e0b' },
      { name: isRtl ? 'المنافع والخدمات' : 'Utilities', value: std.utilitiesCost, color: '#6366f1' },
      { name: isRtl ? 'المصاريف غير المباشرة' : 'Overheads', value: std.overheadCost, color: '#ec4899' },
      { name: isRtl ? 'الشحن والتوزيع' : 'Freight & Logistics', value: std.freightCost, color: '#8b5cf6' },
      { name: isRtl ? 'المصاريف البيعية' : 'Selling Expenses', value: std.sellingCost, color: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [data, isRtl]);

  const barChartData = useMemo(() => {
    if (!data) return [];
    const std = data.standard;
    const act = data.actual;
    return [
      { name: isRtl ? 'المواد الخام' : 'Raw Materials', Standard: std.rawMaterialCost, Actual: act.rawMaterialCost },
      { name: isRtl ? 'التعبئة والتغليف' : 'Packaging', Standard: std.packagingCost, Actual: act.packagingCost },
      { name: isRtl ? 'التصنيع' : 'Manufacturing', Standard: std.manufacturingCost, Actual: act.manufacturingCost },
      { name: isRtl ? 'الشحن والخدمات' : 'Logistics & Selling', Standard: std.freightCost + std.sellingCost + std.warehouseCost, Actual: act.freightCost + act.sellingCost + act.warehouseCost },
    ];
  }, [data, isRtl]);

  // Calculations for contribution margin & ROI
  const contributionMargin = useMemo(() => {
    if (!data) return 0;
    const std = data.standard;
    // Contribution margin = Sales - Variable Costs (Materials + Packaging + Freight + Utilities)
    const varCosts = std.rawMaterialCost + std.packagingCost + std.freightCost + std.utilitiesCost;
    return std.sellingPrice - varCosts;
  }, [data]);

  const roi = useMemo(() => {
    if (!data || data.standard.totalCost === 0) return 0;
    return (data.standard.netProfit / data.standard.totalCost) * 100;
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-[550px] items-center justify-center">
        <LoadingState rows={8} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center text-center p-6">
        <div className="rounded-full bg-red-50 p-3 text-red-500 dark:bg-red-950/20">
          <Info className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{error ?? 'Product data unavailable'}</p>
        <Button variant="outline" className="mt-4" onClick={() => void loadData()}>{t('common.retry')}</Button>
      </div>
    );
  }

  const { standard: std, actual: act } = data;
  const variance = act.totalCost - std.totalCost;
  const variancePct = std.totalCost > 0 ? (variance / std.totalCost) * 100 : 0;

  return (
    <div className="flex flex-col h-[650px] overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100">
      
      {/* Product Information header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-600" />
            {data.name}
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">SKU: {data.sku} | Recipe Version: {data.bomVersion ?? 'v1'}</p>
        </div>
        
        {/* Period Selector & Recalculate */}
        <div className="flex items-center gap-3 mt-3 md:mt-0">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 py-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-xs outline-none font-medium text-slate-600 dark:text-slate-300 border-none w-28 cursor-pointer"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            isLoading={isRecalculating}
            onClick={() => void handleRecalculate()}
            className="text-xs h-7 py-1 px-2.5 flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-3 w-3 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRtl ? 'تحديث التكلفة' : 'Recalculate'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6">
        {(['overview', 'tree', 'charts', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === tab
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'overview' && (isRtl ? 'ملخص التكلفة' : 'Cost Summary')}
            {tab === 'tree' && (isRtl ? 'شجرة التكلفة' : 'BOM Cost Tree')}
            {tab === 'charts' && (isRtl ? 'توزيع التكلفة' : 'Cost Charts')}
            {tab === 'history' && (isRtl ? 'السجل التاريخي' : 'Cost History')}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{isRtl ? 'سعر البيع' : 'Selling Price'}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">${std.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{isRtl ? 'التكلفة القياسية' : 'Standard Cost'}</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">${std.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{isRtl ? 'التكلفة الفعلية' : 'Actual Cost'}</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">${act.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{isRtl ? 'الانحراف المالي' : 'Cost Variance'}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <p className={`text-xl font-bold ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {variance > 0 ? '+' : ''}${variance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${variance > 0 ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'}`}>
                    {variance > 0 ? '+' : ''}{variancePct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Profitability Executive Card */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">{isRtl ? 'بطاقة الربحية التنفيذية' : 'Executive Profitability Card'}</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-slate-400">{isRtl ? 'ربح المنتج الإجمالي' : 'Gross Profit'}</p>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">${std.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <span className="text-[10px] text-emerald-600 font-bold">{std.grossMarginPct.toFixed(1)}% {isRtl ? 'هامش' : 'Margin'}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400">{isRtl ? 'ربح المنتج الصافي' : 'Net Profit'}</p>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">${std.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <span className="text-[10px] text-emerald-600 font-bold">{std.netMarginPct.toFixed(1)}% {isRtl ? 'صافي هامش' : 'Net Margin'}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400">{isRtl ? 'هامش المساهمة' : 'Contribution Margin'}</p>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">${contributionMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <span className="text-[10px] text-slate-500 font-semibold">{isRtl ? 'المبيعات - التكاليف المتغيرة' : 'Sales - Variable Costs'}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400">{isRtl ? 'عائد الاستثمار (ROI)' : 'Return on Investment (ROI)'}</p>
                  <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">{roi.toFixed(1)}%</p>
                  <span className="text-[10px] text-slate-500 font-semibold">{isRtl ? 'صافي الربح / إجمالي التكلفة' : 'Net Profit / Total Cost'}</span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">{isRtl ? 'حالة ربحية المنتج:' : 'Product Margin Status:'}</span>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${
                  std.netMarginPct > 20
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                    : std.netMarginPct > 5
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                }`}>
                  <Activity className="h-3 w-3" />
                  {std.netMarginPct > 20 ? (isRtl ? 'ربحية عالية' : 'High Margin') : std.netMarginPct > 5 ? (isRtl ? 'ربحية مقبولة' : 'Healthy Margin') : (isRtl ? 'ربحية متدنية' : 'Low / Negative Margin')}
                </span>
              </div>
            </div>

            {/* Standard vs Actual Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-5 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{isRtl ? 'تفاصيل التكلفة القياسية' : 'Standard Cost Details'}</h4>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isRtl ? 'المواد الخام' : 'Raw Materials'}</span>
                    <span className="font-semibold">${std.rawMaterialCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isRtl ? 'التعبئة والتغليف' : 'Packaging'}</span>
                    <span className="font-semibold">${std.packagingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isRtl ? 'تكلفة التصنيع (عمالة + طاقة + إداري)' : 'Manufacturing (Labor, Utilities, Overheads)'}</span>
                    <span className="font-semibold">${std.manufacturingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 font-bold text-slate-900 dark:text-slate-100">
                    <span>{isRtl ? 'إجمالي تكلفة المنتج' : 'Total Standard Cost'}</span>
                    <span>${std.totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-5 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{isRtl ? 'تفاصيل التكلفة الفعلية' : 'Actual Cost Details'}</h4>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isRtl ? 'المواد الخام (أسعار المشتريات الفعلية)' : 'Raw Materials (Actual Import Price)'}</span>
                    <span className="font-semibold">${act.rawMaterialCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isRtl ? 'التعبئة والتغليف' : 'Packaging'}</span>
                    <span className="font-semibold">${act.packagingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isRtl ? 'التصنيع المخصص (الكهرباء، العمالة، الإداري)' : 'Allocated Manufacturing Cost'}</span>
                    <span className="font-semibold">${act.manufacturingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 font-bold text-slate-900 dark:text-slate-100">
                    <span>{isRtl ? 'إجمالي التكلفة الفعلية' : 'Total Actual Cost'}</span>
                    <span>${act.totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TREE VIEW TAB */}
        {activeTab === 'tree' && (
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
              <FolderTree className="h-4 w-4 text-emerald-600" />
              {isRtl ? 'هيكل التكلفة المفصل للمنتج' : 'Cost Category Hierarchy tree'}
            </h3>

            {/* Tree View Structure */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden text-sm">
              
              {/* Header */}
              <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-500 uppercase">
                <div className="col-span-6">{isRtl ? 'بند التكلفة' : 'Cost Component'}</div>
                <div className="col-span-2 text-right">{isRtl ? 'النسبة %' : 'Share %'}</div>
                <div className="col-span-2 text-right">{isRtl ? 'التكلفة القياسية' : 'Standard Cost'}</div>
                <div className="col-span-2 text-right">{isRtl ? 'التكلفة الفعلية' : 'Actual Cost'}</div>
              </div>

              {/* 1. Raw Materials */}
              <div>
                <div
                  onClick={() => toggleNode('materials')}
                  className="grid grid-cols-12 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 cursor-pointer font-semibold"
                >
                  <div className="col-span-6 flex items-center gap-1.5">
                    {expandedNodes.materials ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <span>{isRtl ? 'المواد الخام' : 'Raw Materials'}</span>
                  </div>
                  <div className="col-span-2 text-right text-slate-500">{((std.rawMaterialCost / (std.totalCost || 1)) * 100).toFixed(1)}%</div>
                  <div className="col-span-2 text-right">${std.rawMaterialCost.toFixed(3)}</div>
                  <div className="col-span-2 text-right">${act.rawMaterialCost.toFixed(3)}</div>
                </div>

                {expandedNodes.materials && (
                  <div className="bg-slate-50/30 dark:bg-slate-900/10 pl-6 pr-4 py-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 border-l-2 border-emerald-500">
                    <div className="grid grid-cols-12 py-1">
                      <div className="col-span-6">{isRtl ? 'المادة الفعالة الرئيسية (الذرة / الفول / الحمص)' : 'Main Food Ingredient (Corn/Beans)'}</div>
                      <div className="col-span-2 text-right">—</div>
                      <div className="col-span-2 text-right">${(std.rawMaterialCost * 0.85).toFixed(3)}</div>
                      <div className="col-span-2 text-right">${(act.rawMaterialCost * 0.88).toFixed(3)}</div>
                    </div>
                    <div className="grid grid-cols-12 py-1">
                      <div className="col-span-6">{isRtl ? 'المواد المضافة والمياه والملح والمواد الحافظة' : 'Water, Salt, Preservatives & Citric Acid'}</div>
                      <div className="col-span-2 text-right">—</div>
                      <div className="col-span-2 text-right">${(std.rawMaterialCost * 0.15).toFixed(3)}</div>
                      <div className="col-span-2 text-right">${(act.rawMaterialCost * 0.12).toFixed(3)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Packaging */}
              <div>
                <div
                  onClick={() => toggleNode('packaging')}
                  className="grid grid-cols-12 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 cursor-pointer font-semibold"
                >
                  <div className="col-span-6 flex items-center gap-1.5">
                    {expandedNodes.packaging ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <span>{isRtl ? 'التعبئة والتغليف' : 'Packaging Materials'}</span>
                  </div>
                  <div className="col-span-2 text-right text-slate-500">{((std.packagingCost / (std.totalCost || 1)) * 100).toFixed(1)}%</div>
                  <div className="col-span-2 text-right">${std.packagingCost.toFixed(3)}</div>
                  <div className="col-span-2 text-right">${act.packagingCost.toFixed(3)}</div>
                </div>

                {expandedNodes.packaging && (
                  <div className="bg-slate-50/30 dark:bg-slate-900/10 pl-6 pr-4 py-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 border-l-2 border-blue-500">
                    <div className="grid grid-cols-12 py-1">
                      <div className="col-span-6">{isRtl ? 'جسم العلبة المعدنية (Tin Can Body)' : 'Canned Tin Can Body'}</div>
                      <div className="col-span-2 text-right">—</div>
                      <div className="col-span-2 text-right">${(std.packagingCost * 0.55).toFixed(3)}</div>
                      <div className="col-span-2 text-right">${(act.packagingCost * 0.53).toFixed(3)}</div>
                    </div>
                    <div className="grid grid-cols-12 py-1">
                      <div className="col-span-6">{isRtl ? 'غطاء علبة سهل الفتح (Easy-Open Lid)' : 'Easy-Open Metal Lid'}</div>
                      <div className="col-span-2 text-right">—</div>
                      <div className="col-span-2 text-right">${(std.packagingCost * 0.25).toFixed(3)}</div>
                      <div className="col-span-2 text-right">${(act.packagingCost * 0.27).toFixed(3)}</div>
                    </div>
                    <div className="grid grid-cols-12 py-1">
                      <div className="col-span-6">{isRtl ? 'الملصق الخارجي والكرتونة الحاضنة' : 'Outer Label Sleeve & Shipping Carton'}</div>
                      <div className="col-span-2 text-right">—</div>
                      <div className="col-span-2 text-right">${(std.packagingCost * 0.20).toFixed(3)}</div>
                      <div className="col-span-2 text-right">${(act.packagingCost * 0.20).toFixed(3)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Manufacturing */}
              <div>
                <div
                  onClick={() => toggleNode('mfg')}
                  className="grid grid-cols-12 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 cursor-pointer font-semibold"
                >
                  <div className="col-span-6 flex items-center gap-1.5">
                    {expandedNodes.mfg ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <span>{isRtl ? 'تكاليف التصنيع' : 'Manufacturing Cost'}</span>
                  </div>
                  <div className="col-span-2 text-right text-slate-500">{((std.manufacturingCost / (std.totalCost || 1)) * 100).toFixed(1)}%</div>
                  <div className="col-span-2 text-right">${std.manufacturingCost.toFixed(3)}</div>
                  <div className="col-span-2 text-right">${act.manufacturingCost.toFixed(3)}</div>
                </div>

                {expandedNodes.mfg && (
                  <div className="bg-slate-50/30 dark:bg-slate-900/10 pl-6 pr-4 py-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 border-l-2 border-yellow-500">
                    <div className="grid grid-cols-12 py-1">
                      <div className="col-span-6">{isRtl ? 'العمالة المباشرة (تشغيل وتعبئة)' : 'Direct Labor (Cooking & Packing)'}</div>
                      <div className="col-span-2 text-right">—</div>
                      <div className="col-span-2 text-right">${std.laborCost.toFixed(3)}</div>
                      <div className="col-span-2 text-right">${act.laborCost.toFixed(3)}</div>
                    </div>
                    <div className="grid grid-cols-12 py-1">
                      <div className="col-span-6">{isRtl ? 'تكلفة الطاقة والمنافع (بخار، ماء، كهرباء)' : 'Factory Utilities (Steam, Electricity, Gas)'}</div>
                      <div className="col-span-2 text-right">—</div>
                      <div className="col-span-2 text-right">${std.utilitiesCost.toFixed(3)}</div>
                      <div className="col-span-2 text-right">${act.utilitiesCost.toFixed(3)}</div>
                    </div>
                    <div className="grid grid-cols-12 py-1">
                      <div className="col-span-6">{isRtl ? 'المصاريف الصناعية غير المباشرة (إدارة ومصنع)' : 'Indirect Manufacturing Overheads'}</div>
                      <div className="col-span-2 text-right">—</div>
                      <div className="col-span-2 text-right">${std.overheadCost.toFixed(3)}</div>
                      <div className="col-span-2 text-right">${act.overheadCost.toFixed(3)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Logistics */}
              <div className="grid grid-cols-12 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 cursor-pointer font-semibold">
                <div className="col-span-6 pl-5.5">{isRtl ? 'تكاليف التوزيع والخدمات اللوجستية' : 'Warehouse & Logistics'}</div>
                <div className="col-span-2 text-right text-slate-500">{(((std.freightCost + std.warehouseCost) / (std.totalCost || 1)) * 100).toFixed(1)}%</div>
                <div className="col-span-2 text-right">${(std.freightCost + std.warehouseCost).toFixed(3)}</div>
                <div className="col-span-2 text-right">${(act.freightCost + act.warehouseCost).toFixed(3)}</div>
              </div>

              {/* 5. Selling */}
              <div className="grid grid-cols-12 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 cursor-pointer font-semibold">
                <div className="col-span-6 pl-5.5">{isRtl ? 'المصاريف البيعية والتسويقية' : 'Selling & Marketing Cost'}</div>
                <div className="col-span-2 text-right text-slate-500">{((std.sellingCost / (std.totalCost || 1)) * 100).toFixed(1)}%</div>
                <div className="col-span-2 text-right">${std.sellingCost.toFixed(3)}</div>
                <div className="col-span-2 text-right">${act.sellingCost.toFixed(3)}</div>
              </div>

              {/* Grand Total */}
              <div className="grid grid-cols-12 bg-emerald-500/10 px-4 py-3 border-t-2 border-emerald-500 font-extrabold text-emerald-950 dark:text-emerald-400">
                <div className="col-span-6">{isRtl ? 'إجمالي التكلفة الكلية للمنتج' : 'Grand Total Cost (COGS + SG&A)'}</div>
                <div className="col-span-2 text-right">100%</div>
                <div className="col-span-2 text-right">${std.totalCost.toFixed(3)}</div>
                <div className="col-span-2 text-right">${act.totalCost.toFixed(3)}</div>
              </div>

            </div>
          </div>
        )}

        {/* CHARTS TAB */}
        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Donut Chart - Component share */}
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-5 shadow-sm flex flex-col items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 self-start mb-4">
                {isRtl ? 'توزيع عناصر التكلفة (قياسي)' : 'Cost Elements Distribution (Standard)'}
              </h4>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart - Std vs Actual */}
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-5 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                {isRtl ? 'التكلفة القياسية مقابل الفعلية' : 'Standard vs Actual Cost Comparison'}
              </h4>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
                    <RechartsTooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="Standard" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* HISTORY SNAPSHOTS TAB */}
        {activeTab === 'history' && (
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-emerald-600" />
              {isRtl ? 'لقطات التكلفة التاريخية المحفوظة' : 'Historical Cost Snapshots'}
            </h3>

            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Info className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">{isRtl ? 'لا توجد لقطات تاريخية محفوظة للمنتج' : 'No cost snapshots found for this product yet.'}</p>
                <Button size="sm" className="mt-3" onClick={() => void handleRecalculate()}>{isRtl ? 'حفظ أول لقطة للتكلفة' : 'Recalculate & Save First Snapshot'}</Button>
              </div>
            ) : (
              <div className="overflow-x-auto text-sm border border-slate-100 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 font-bold text-xs text-slate-500 uppercase">
                      <th className="px-4 py-3">{isRtl ? 'الفترة' : 'Period'}</th>
                      <th className="px-4 py-3">{isRtl ? 'تاريخ الحفظ' : 'Snapshot Date'}</th>
                      <th className="px-4 py-3 text-right">{isRtl ? 'التكلفة القياسية' : 'Standard Cost'}</th>
                      <th className="px-4 py-3 text-right">{isRtl ? 'التكلفة الفعلية' : 'Actual Cost'}</th>
                      <th className="px-4 py-3 text-right">{isRtl ? 'هامش الربح القياسي %' : 'Std Margin %'}</th>
                      <th className="px-4 py-3 text-right">{isRtl ? 'هامش الربح الفعلي %' : 'Actual Margin %'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((snap) => (
                      <tr key={snap.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="px-4 py-3 font-semibold font-mono">{snap.period}</td>
                        <td className="px-4 py-3 text-slate-500">{snap.snapshotDate}</td>
                        <td className="px-4 py-3 text-right">${snap.standard.totalCost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">${snap.actual.totalCost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">{snap.standard.netMarginPct.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-600">{snap.actual.netMarginPct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
      
      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 flex justify-end">
        <Button onClick={onClose} variant="outline" size="sm">
          {t('common.cancel')}
        </Button>
      </div>

    </div>
  );
}
