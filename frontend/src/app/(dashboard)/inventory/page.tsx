'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/feedback-states';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n/i18n-context';
import { Box, Calendar, Clock, AlertTriangle, ShieldAlert, Plus } from 'lucide-react';
import type { InventorySnapshot, Site, Product, Material } from '@/types/api';

interface CoverageItem {
  id: string;
  siteName: string;
  itemId: string;
  name: string;
  codeOrSku: string;
  type: 'product' | 'material';
  qtyOnHand: number;
  value: number;
  avgDailyUsage: number;
  coverageDays: number;
}

interface SlowMovingItem extends CoverageItem {
  status: 'warning' | 'critical';
}

export default function InventoryPage() {
  const { activeCompanyId } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'coverage' | 'slow-moving' | 'snapshots'>('coverage');
  
  // Data States
  const [coverage, setCoverage] = useState<CoverageItem[]>([]);
  const [slowMoving, setSlowMoving] = useState<SlowMovingItem[]>([]);
  const [snapshots, setSnapshots] = useState<InventorySnapshot[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  
  // Form values
  const [siteId, setSiteId] = useState('');
  const [itemType, setItemType] = useState<'product' | 'material'>('product');
  const [productId, setProductId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().split('T')[0]);
  const [qtyOnHand, setQtyOnHand] = useState('0');
  const [inventoryValue, setInventoryValue] = useState('0');

  // Load dropdown data
  useEffect(() => {
    async function loadDropdowns() {
      if (!activeCompanyId) return;
      try {
        const [sitesRes, prodRes, matRes] = await Promise.all([
          apiGet<{ data: Site[] }>('/sites?limit=100'),
          apiGet<{ data: Product[] }>('/products?limit=1000'),
          apiGet<{ data: Material[] }>('/materials?limit=1000'),
        ]);
        setSites(sitesRes.data ?? []);
        setProducts(prodRes.data ?? []);
        setMaterials(matRes.data ?? []);
        if (sitesRes.data && sitesRes.data.length > 0) setSiteId(sitesRes.data[0].id);
        if (prodRes.data && prodRes.data.length > 0) setProductId(prodRes.data[0].id);
        if (matRes.data && matRes.data.length > 0) setMaterialId(matRes.data[0].id);
      } catch {
        // Failed to load dropdowns
      }
    }
    void loadDropdowns();
  }, [activeCompanyId]);

  const fetchData = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'coverage') {
        const res = await apiGet<CoverageItem[]>('/inventory/coverage');
        setCoverage(res ?? []);
      } else if (activeTab === 'slow-moving') {
        const res = await apiGet<SlowMovingItem[]>('/inventory/slow-moving');
        setSlowMoving(res ?? []);
      } else if (activeTab === 'snapshots') {
        const res = await apiGet<InventorySnapshot[]>('/inventory/snapshots');
        setSnapshots(res ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('page.inventory.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, activeTab]);

  useEffect(() => {
    void fetchData();
  }, [activeTab, fetchData]);

  async function handleCreateSnapshot(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    const payload = {
      siteId,
      productId: itemType === 'product' ? productId : undefined,
      materialId: itemType === 'material' ? materialId : undefined,
      snapshotDate,
      qtyOnHand: parseFloat(qtyOnHand),
      inventoryValue: parseFloat(inventoryValue),
    };

    try {
      await apiPost('/inventory/snapshots', payload);
      toastSuccess(t('page.inventory.snapshotRecorded'));
      setSnapshotModalOpen(false);
      void fetchData();
    } catch (err) {
      toastError(t('page.inventory.snapshotFailed'));
    } finally {
      setFormLoading(false);
    }
  }

  // Columns Definitions
  const coverageColumns: Column<CoverageItem>[] = [
    { key: 'siteName', header: t('page.inventory.siteWarehouse') },
    { key: 'name', header: t('page.inventory.itemName'), className: 'font-semibold text-slate-700' },
    { key: 'codeOrSku', header: t('page.inventory.skuCode'), className: 'font-mono text-xs text-slate-500' },
    { key: 'type', header: t('page.inventory.type'), render: (v) => String(v).toUpperCase(), className: 'text-xs text-slate-400 font-mono' },
    { key: 'qtyOnHand', header: t('page.inventory.qtyOnHand'), render: (v) => Number(v).toLocaleString(), className: 'text-right font-mono' },
    { key: 'value', header: t('page.inventory.value'), render: (v) => Number(v).toLocaleString(), className: 'text-right font-mono text-slate-600' },
    { key: 'avgDailyUsage', header: t('page.inventory.avgDailyOutflow'), render: (v) => Number(v).toFixed(2), className: 'text-right font-mono text-slate-500' },
    {
      key: 'coverageDays',
      header: t('page.inventory.coverageDays'),
      className: 'text-right font-mono font-bold',
      render: (v) => {
        const days = Number(v);
        let color = 'text-emerald-600';
        if (days < 15) color = 'text-red-600';
        else if (days > 90) color = 'text-amber-600';
        return <span className={color}>{days === 365 ? t('page.inventory.365plusDays') : t('page.inventory.nDays', { days })}</span>;
      },
    },
  ];

  const slowMovingColumns: Column<SlowMovingItem>[] = [
    { key: 'siteName', header: t('page.inventory.siteWarehouse') },
    { key: 'name', header: t('page.inventory.itemName'), className: 'font-semibold text-slate-700' },
    { key: 'codeOrSku', header: t('page.inventory.skuCode'), className: 'font-mono text-xs text-slate-500' },
    { key: 'qtyOnHand', header: t('page.inventory.qtyOnHand'), render: (v) => Number(v).toLocaleString(), className: 'text-right font-mono' },
    { key: 'value', header: t('page.inventory.value'), render: (v) => Number(v).toLocaleString(), className: 'text-right font-mono' },
    { key: 'coverageDays', header: t('page.inventory.coverageDays'), render: (v) => t('page.inventory.nDays', { days: Number(v).toFixed(0) }), className: 'text-right font-mono text-slate-600' },
    {
      key: 'status',
      header: t('page.inventory.riskLevel'),
      className: 'text-center font-semibold text-xs',
      render: (v) =>
        v === 'critical' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-red-700">
            <ShieldAlert className="h-3 w-3" /> {t('page.inventory.critical')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700">
            <AlertTriangle className="h-3 w-3" /> {t('page.inventory.warning')}
          </span>
        ),
    },
  ];

  const snapshotColumns: Column<InventorySnapshot>[] = [
    { key: 'snapshotDate', header: t('page.inventory.date'), render: (v) => new Date(v as string).toLocaleDateString() },
    { key: 'site', header: t('page.inventory.siteCol'), render: (v) => (v as any)?.name ?? '—' },
    { key: 'product', header: t('page.inventory.product'), render: (v) => (v as any)?.name ? `[${(v as any).sku}] ${(v as any).name}` : '—' },
    { key: 'material', header: t('page.inventory.material'), render: (v) => (v as any)?.name ? `[${(v as any).code}] ${(v as any).name}` : '—' },
    { key: 'qtyOnHand', header: t('page.inventory.qtyRecorded'), render: (v) => Number(v).toLocaleString(), className: 'text-right font-mono' },
    { key: 'inventoryValue', header: t('page.inventory.valuation'), render: (v) => Number(v).toLocaleString(), className: 'text-right font-mono text-slate-600 font-bold' },
  ];

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('page.inventory.title')} />
        <ErrorState title={t('common.noCompany')} message={t('common.selectCompany')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('page.inventory.title')} description={t('page.inventory.description')}>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setSnapshotModalOpen(true)}>
            <Plus className="h-4 w-4" /> {t('page.inventory.recordSnapshot')}
          </Button>
        </div>
      </PageHeader>

      {/* Stats Summary Panel */}
      {activeTab === 'coverage' && coverage.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">{t('page.inventory.totalItemsInStock')}</p>
              <h3 className="text-xl font-bold text-slate-800">{coverage.length}</h3>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="rounded-lg bg-indigo-50 p-3 text-indigo-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">{t('page.inventory.avgStockCoverage')}</p>
              <h3 className="text-xl font-bold text-slate-800">
                {t('page.inventory.nDays', { days: (coverage.reduce((s, c) => s + c.coverageDays, 0) / coverage.length).toFixed(0) })}
              </h3>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="rounded-lg bg-red-50 p-3 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">{t('page.inventory.lowStockAlerts')}</p>
              <h3 className="text-xl font-bold text-slate-800">
                {t('page.inventory.nItems', { count: coverage.filter((c) => c.coverageDays < 15).length })}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-0">
        {[
          { key: 'coverage', label: t('page.inventory.coverageAnalysis') },
          { key: 'slow-moving', label: t('page.inventory.slowMovingWarning') },
          { key: 'snapshots', label: t('page.inventory.snapshotsLog') },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingState rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : activeTab === 'coverage' ? (
        coverage.length === 0 ? (
          <EmptyState title={t('page.inventory.noCoverageData')} description={t('page.inventory.noCoverageDataDesc')} />
        ) : (
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <TableWrapper<CoverageItem> data={coverage} columns={coverageColumns} keyExtractor={(r) => r.id} />
          </div>
        )
      ) : activeTab === 'slow-moving' ? (
        slowMoving.length === 0 ? (
          <EmptyState title={t('page.inventory.noSlowMoving')} description={t('page.inventory.noSlowMovingDesc')} />
        ) : (
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <TableWrapper<SlowMovingItem> data={slowMoving} columns={slowMovingColumns} keyExtractor={(r) => r.id} />
          </div>
        )
      ) : (
        snapshots.length === 0 ? (
          <EmptyState title={t('page.inventory.noSnapshots')} description={t('page.inventory.noSnapshotsDesc')} />
        ) : (
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <TableWrapper<InventorySnapshot> data={snapshots} columns={snapshotColumns} keyExtractor={(r) => r.id} />
          </div>
        )
      )}

      {/* Snapshot Entry Modal */}
      {snapshotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSnapshotModalOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">{t('page.inventory.recordSnapshot')}</h2>
            </div>
            <form onSubmit={handleCreateSnapshot} className="px-6 py-5 flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500">{t('page.inventory.warehouseSite')}</label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500">{t('page.inventory.itemType')}</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input type="radio" checked={itemType === 'product'} onChange={() => setItemType('product')} />
                    {t('page.inventory.finishedGoodProduct')}
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input type="radio" checked={itemType === 'material'} onChange={() => setItemType('material')} />
                    {t('page.inventory.rawMaterialIngredient')}
                  </label>
                </div>
              </div>

              {itemType === 'product' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-500">{t('page.inventory.product')}</label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-500">{t('page.inventory.material')}</label>
                  <select
                    value={materialId}
                    onChange={(e) => setMaterialId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>[{m.code}] {m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <Input id="snap-date" type="date" label={t('page.inventory.snapshotDate')} value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} />
              
              <div className="grid grid-cols-2 gap-4">
                <Input id="snap-qty" type="number" label={t('page.inventory.qtyOnHand')} value={qtyOnHand} onChange={(e) => setQtyOnHand(e.target.value)} />
                <Input id="snap-val" type="number" label={t('page.inventory.totalValuation')} value={inventoryValue} onChange={(e) => setInventoryValue(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setSnapshotModalOpen(false)}>{t('common.cancel')}</Button>
                <Button size="sm" type="submit" isLoading={formLoading}>{t('page.inventory.record')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
