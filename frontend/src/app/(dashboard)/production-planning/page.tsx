'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Factory,
  Plus,
  Trash2,
  Zap,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Layers,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { apiGet, apiPost } from '@/lib/api';
import type { Product, PaginatedResponse, Site } from '@/types/api';
import { Modal } from '@/components/ui/modal';
import { MONTH_NAMES } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { TranslationKey } from '@/lib/i18n/translations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SalesPlanLine {
  id: string; // local UI key
  productId: string;
  quantity: number;
}

interface ProductExplosionResult {
  productId: string;
  name: string;
  sku: string;
  salesQty: number;
  recipeVersion: string | null;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  recipeWastageCost: number;
  totalCost: number;
}

interface MaterialRequirement {
  materialId: string;
  name: string;
  code: string;
  requiredQty: number;
  unitPrice: number;
  totalCost: number;
  wastageQty: number;
  wastageCost: number;
}

interface ExplosionResult {
  products: ProductExplosionResult[];
  materials: MaterialRequirement[];
  totalSalesQty: number;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  totalWastageCost: number;
  grandTotalCost: number;
  capacityUtilizationPct: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(n: number): string {
  return `$${fmt(n)}`;
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Capacity bar
// ---------------------------------------------------------------------------
function CapacityBar({ pct, t }: { pct: number; t: (key: TranslationKey, params?: Record<string, string | number>) => string }) {
  const clamped = Math.min(pct, 100);
  const color =
    clamped < 60
      ? 'bg-emerald-500'
      : clamped < 85
        ? 'bg-amber-500'
        : 'bg-red-500';
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('page.productionPlanning.capacityUtilization')}</p>
        <span
          className={`text-sm font-bold ${clamped < 60 ? 'text-emerald-600' : clamped < 85 ? 'text-amber-600' : 'text-red-600'}`}
        >
          {fmt(pct, 1)}%
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-2">{t('page.productionPlanning.capacityThreshold')}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product breakdown row
// ---------------------------------------------------------------------------
function ProductRow({ p, t }: { p: ProductExplosionResult; t: (key: TranslationKey, params?: Record<string, string | number>) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          <div>
            <p className="text-sm font-semibold text-slate-800">{p.name}</p>
            <p className="text-xs text-slate-400">
              {t('page.productionPlanning.sku')}: {p.sku} &bull; {t('page.productionPlanning.version')}: {p.recipeVersion ?? 'N/A'} &bull; {t('page.productionPlanning.qty')}:{' '}
              <span className="font-semibold text-slate-600">{fmt(p.salesQty, 0)}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-900">{fmtCurrency(p.totalCost)}</p>
          <p className="text-xs text-slate-400">{t('page.productionPlanning.totalCost')}</p>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50">
          {[
            { label: t('page.productionPlanning.materialCost'), value: fmtCurrency(p.materialCost), color: 'text-blue-600' },
            { label: t('page.productionPlanning.laborCost'), value: fmtCurrency(p.laborCost), color: 'text-violet-600' },
            { label: t('page.productionPlanning.overheadCost'), value: fmtCurrency(p.overheadCost), color: 'text-amber-600' },
            { label: t('page.productionPlanning.wastageCost'), value: fmtCurrency(p.recipeWastageCost), color: 'text-red-500' },
          ].map((item, idx) => (
            <div key={idx}>
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Materials table
// ---------------------------------------------------------------------------
function MaterialsTable({ materials, t }: { materials: MaterialRequirement[]; t: (key: TranslationKey, params?: Record<string, string | number>) => string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('page.productionPlanning.material')}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('page.productionPlanning.requiredQty')}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('page.productionPlanning.wastageQty')}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('page.productionPlanning.unitPrice')}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('page.productionPlanning.totalCost')}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('page.productionPlanning.wastageCost')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {materials.map((m) => (
            <tr key={m.materialId} className="bg-white hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-800 text-xs">{m.name}</p>
                <p className="text-slate-400 text-xs">{m.code}</p>
              </td>
              <td className="px-4 py-3 text-right font-mono text-xs text-slate-700">{fmt(m.requiredQty, 4)}</td>
              <td className="px-4 py-3 text-right font-mono text-xs text-amber-600">{fmt(m.wastageQty, 4)}</td>
              <td className="px-4 py-3 text-right font-mono text-xs text-slate-700">{fmtCurrency(m.unitPrice)}</td>
              <td className="px-4 py-3 text-right font-mono text-xs font-bold text-slate-900">{fmtCurrency(m.totalCost)}</td>
              <td className="px-4 py-3 text-right font-mono text-xs text-red-500">{fmtCurrency(m.wastageCost)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 border-t border-slate-200">
            <td className="px-4 py-3 text-xs font-bold text-slate-700 uppercase" colSpan={4}>
              {t('page.productionPlanning.totals')}
            </td>
            <td className="px-4 py-3 text-right font-mono text-sm font-bold text-emerald-700">
              {fmtCurrency(materials.reduce((s, m) => s + m.totalCost, 0))}
            </td>
            <td className="px-4 py-3 text-right font-mono text-sm font-bold text-red-500">
              {fmtCurrency(materials.reduce((s, m) => s + m.wastageCost, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ProductionPlanningPage() {
  const { t } = useI18n();
  const { error: toastError, success: toastSuccess } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [planLines, setPlanLines] = useState<SalesPlanLine[]>([
    { id: crypto.randomUUID(), productId: '', quantity: 100 },
  ]);
  const [result, setResult] = useState<ExplosionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'materials'>('products');

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [saveSiteId, setSaveSiteId] = useState('');
  const [saveYear, setSaveYear] = useState(String(new Date().getFullYear()));
  const [saveMonth, setSaveMonth] = useState('1');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    async function loadSites() {
      try {
        const res = await apiGet<{ data: Site[] }>('/sites?limit=100');
        const activeSites = res.data ?? [];
        setSites(activeSites);
        if (activeSites.length > 0) {
          setSaveSiteId(activeSites[0].id);
        }
      } catch {
        // Failed to load sites
      }
    }
    if (result) {
      void loadSites();
    }
  }, [result]);

  async function handleSavePlan() {
    if (!saveSiteId) {
      toastError(t('page.productionPlanning.selectSite'));
      return;
    }
    setSaveLoading(true);
    try {
      const payload = {
        siteId: saveSiteId,
        fiscalYear: parseInt(saveYear, 10),
        periodMonth: parseInt(saveMonth, 10),
        items: result!.products.map((p) => ({
          productId: p.productId,
          plannedQty: p.salesQty,
          estimatedCost: p.totalCost,
        })),
      };
      await apiPost('/production-plans/save-from-explosion', payload);
      toastSuccess(t('page.productionPlanning.savedSuccess'));
      setSaveModalOpen(false);
    } catch (err) {
      toastError(t('page.productionPlanning.saveFailed'));
    } finally {
      setSaveLoading(false);
    }
  }

  // load product list
  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<PaginatedResponse<Product>>('/products?limit=1000');
        setProducts(res.data ?? []);
      } catch {
        toastError(t('page.productionPlanning.loadProductsFailed'));
      }
    }
    void load();
  }, [toastError]);

  const addLine = useCallback(() => {
    setPlanLines((prev) => [...prev, { id: crypto.randomUUID(), productId: '', quantity: 100 }]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setPlanLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLine = useCallback((id: string, field: 'productId' | 'quantity', value: string | number) => {
    setPlanLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );
  }, []);

  async function handleExplode() {
    for (const line of planLines) {
      if (!line.productId) {
        toastError(t('page.productionPlanning.selectProduct'));
        return;
      }
      if (line.quantity <= 0) {
        toastError(t('page.productionPlanning.quantityGreaterThanZero'));
        return;
      }
    }

    setIsLoading(true);
    try {
      const data = await apiPost<ExplosionResult>('/bom-recipes/explode', {
        salesPlanLines: planLines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
      });
      setResult(data);
      toastSuccess(t('page.productionPlanning.bomExplosionComplete'));
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response: { data: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : t('page.productionPlanning.bomExplosionFailed');
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Factory className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('page.productionPlanning.title')}</h1>
          </div>
          <p className="text-sm text-slate-500 ml-10">
            {t('page.productionPlanning.description')}
          </p>
        </div>
      </div>

      {/* Sales Plan Input */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-500" />
            <h2 className="text-sm font-bold text-slate-800">{t('page.productionPlanning.salesPlanLines')}</h2>
          </div>
          <Button size="sm" variant="outline" onClick={addLine} id="btn-add-plan-line">
            <Plus className="h-3.5 w-3.5 mr-1" /> {t('page.productionPlanning.addProduct')}
          </Button>
        </div>

        <div className="space-y-3">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_130px_40px] gap-3 px-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('page.productionPlanning.product')}</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('page.productionPlanning.quantity')}</span>
            <span />
          </div>

          {planLines.map((line, idx) => (
            <div key={line.id} className="grid grid-cols-[1fr_130px_40px] items-center gap-3">
              <select
                id={`plan-product-${idx}`}
                value={line.productId}
                onChange={(e) => updateLine(line.id, 'productId', e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">{t('page.productionPlanning.selectProduct')}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.sku}] {p.name}
                  </option>
                ))}
              </select>
              <Input
                id={`plan-qty-${idx}`}
                type="number"
                min="1"
                step="1"
                value={line.quantity.toString()}
                onChange={(e) => updateLine(line.id, 'quantity', Number(e.target.value))}
                placeholder="100"
              />
              <button
                type="button"
                onClick={() => removeLine(line.id)}
                disabled={planLines.length === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                aria-label={t('page.productionPlanning.removeLine')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            id="btn-explode"
            onClick={handleExplode}
            isLoading={isLoading}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-violet-200 transition-all"
          >
            <Zap className="h-4 w-4 mr-2" />
            {t('page.productionPlanning.runBomExplosion')}
          </Button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-base font-bold text-slate-800">{t('page.productionPlanning.explosionResults')}</h2>
            <Button
              id="btn-save-production-plan"
              size="sm"
              onClick={() => setSaveModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {t('page.productionPlanning.saveAsPlan')}
            </Button>
          </div>
          {/* KPI summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard
              label={t('page.productionPlanning.grandTotal')}
              value={fmtCurrency(result.grandTotalCost)}
              icon={DollarSign}
              color="bg-gradient-to-br from-violet-500 to-indigo-600"
              sub={t('page.productionPlanning.allProductionCosts')}
            />
            <KpiCard
              label={t('page.productionPlanning.materialCost')}
              value={fmtCurrency(result.totalMaterialCost)}
              icon={Package}
              color="bg-gradient-to-br from-blue-500 to-cyan-500"
            />
            <KpiCard
              label={t('page.productionPlanning.laborCost')}
              value={fmtCurrency(result.totalLaborCost)}
              icon={TrendingUp}
              color="bg-gradient-to-br from-emerald-500 to-teal-500"
            />
            <KpiCard
              label={t('page.productionPlanning.overheadCost')}
              value={fmtCurrency(result.totalOverheadCost)}
              icon={BarChart3}
              color="bg-gradient-to-br from-amber-500 to-orange-500"
            />
            <KpiCard
              label={t('page.productionPlanning.totalWastage')}
              value={fmtCurrency(result.totalWastageCost)}
              icon={AlertTriangle}
              color="bg-gradient-to-br from-red-500 to-rose-600"
              sub={t('page.productionPlanning.materialWastage')}
            />
            <KpiCard
              label={t('page.productionPlanning.totalQty')}
              value={fmt(result.totalSalesQty, 0)}
              icon={Factory}
              color="bg-gradient-to-br from-slate-600 to-slate-800"
              sub={t('page.productionPlanning.unitsPlanned')}
            />
          </div>

          {/* Capacity bar */}
          <CapacityBar pct={result.capacityUtilizationPct} t={t} />

          {/* Tabs */}
          <div>
            <div className="flex border-b border-slate-200 mb-4 gap-0">
              {(['products', 'materials'] as const).map((tab) => (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 text-sm font-semibold capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-violet-500 text-violet-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'products'
                    ? t('page.productionPlanning.productsTab', { count: result.products.length })
                    : t('page.productionPlanning.materialsTab', { count: result.materials.length })}
                </button>
              ))}
            </div>

            {activeTab === 'products' && (
              <div className="space-y-3">
                {result.products.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    {t('page.productionPlanning.noProductsMatch')}
                  </p>
                ) : (
                  result.products.map((p) => <ProductRow key={p.productId} p={p} t={t} />)
                )}
              </div>
            )}

            {activeTab === 'materials' && (
              result.materials.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  {t('page.productionPlanning.noMaterialsFound')}
                </p>
              ) : (
                <MaterialsTable materials={result.materials} t={t} />
              )
            )}
          </div>
        </div>
      )}

      {/* Save Plan Modal */}
      <Modal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title={t('page.productionPlanning.savePlanModalTitle')}
        footer={
          <>
            <Button variant="outline" size="sm" type="button" onClick={() => setSaveModalOpen(false)}>{t('common.cancel')}</Button>
            <Button size="sm" onClick={handleSavePlan} isLoading={saveLoading}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500">{t('page.productionPlanning.targetFactorySite')}</label>
            <select
              value={saveSiteId}
              onChange={(e) => setSaveSiteId(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{t('page.productionPlanning.selectSite')}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="save-year"
              type="number"
              label={t('page.productionPlanning.fiscalYear')}
              value={saveYear}
              onChange={(e) => setSaveYear(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">{t('page.productionPlanning.targetMonth')}</label>
              <select
                value={saveMonth}
                onChange={(e) => setSaveMonth(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {MONTH_NAMES.slice(1).map((name, i) => (
                  <option key={i + 1} value={String(i + 1)}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
