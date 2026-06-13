'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/feedback-states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { Promotion, Product } from '@/types/api';
import { Plus, Tag, DollarSign, Percent, Pencil, Trash2, Calendar, TrendingUp } from 'lucide-react';
import axios from 'axios';

export default function PromotionsPage() {
  const { activeCompanyId } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [products, setProducts] = useState<Product[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Promotion | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteItem, setDeleteItem] = useState<Promotion | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [discountAmt, setDiscountAmt] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetAmt, setBudgetAmt] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [incrementalRevenue, setIncrementalRevenue] = useState('');
  const [isActive, setIsActive] = useState(true);

  const loadPromotions = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', '20');
      const res = await apiGet<{ data: Promotion[]; total: number; page: number; limit: number; totalPages: number }>(
        `/promotions?${params.toString()}`
      );
      setPromotions(res.data ?? []);
      setTotalPages(res.totalPages ?? 1);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, search, page]);

  const loadProducts = useCallback(async () => {
    if (!activeCompanyId) return;
    try {
      const res = await apiGet<{ data: Product[] }>('/products?limit=500');
      setProducts(res.data ?? []);
    } catch {
      // silent
    }
  }, [activeCompanyId]);

  useEffect(() => { void loadPromotions(); }, [loadPromotions]);
  useEffect(() => { void loadProducts(); }, [loadProducts]);

  function resetForm() {
    setName('');
    setDescription('');
    setProductId('');
    setDiscountPct('');
    setDiscountAmt('');
    setStartDate('');
    setEndDate('');
    setBudgetAmt('');
    setActualCost('');
    setIncrementalRevenue('');
    setIsActive(true);
    setFormError(null);
  }

  function openCreateForm() {
    setEditItem(null);
    resetForm();
    setFormOpen(true);
  }

  function openEditForm(p: Promotion) {
    setEditItem(p);
    setName(p.name);
    setDescription(p.description ?? '');
    setProductId(p.productId ?? '');
    setDiscountPct(p.discountPct ?? '');
    setDiscountAmt(p.discountAmt ?? '');
    setStartDate(p.startDate ? p.startDate.slice(0, 10) : '');
    setEndDate(p.endDate ? p.endDate.slice(0, 10) : '');
    setBudgetAmt(p.budgetAmt ?? '');
    setActualCost(p.actualCost ?? '');
    setIncrementalRevenue(p.incrementalRevenue ?? '');
    setIsActive(p.isActive);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setFormError('Name is required'); return; }
    if (!startDate) { setFormError('Start date is required'); return; }
    setFormLoading(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        productId: productId || undefined,
        discountPct: discountPct ? Number(discountPct) : undefined,
        discountAmt: discountAmt ? Number(discountAmt) : undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        budgetAmt: budgetAmt ? Number(budgetAmt) : undefined,
        actualCost: actualCost ? Number(actualCost) : undefined,
        incrementalRevenue: incrementalRevenue ? Number(incrementalRevenue) : undefined,
        isActive,
      };
      if (editItem) {
        await apiPatch(`/promotions/${editItem.id}`, payload);
        toastSuccess('Promotion updated successfully');
      } else {
        await apiPost('/promotions', payload);
        toastSuccess('Promotion created successfully');
      }
      setFormOpen(false);
      void loadPromotions();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string })?.message ?? 'Operation failed';
        setFormError(msg);
      } else {
        setFormError('An unexpected error occurred');
      }
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/promotions/${deleteItem.id}`);
      toastSuccess('Promotion deleted successfully');
      setDeleteItem(null);
      void loadPromotions();
    } catch (err) {
      toastError('Failed to delete promotion');
    } finally {
      setDeleteLoading(false);
    }
  }

  const columns: Column<Promotion>[] = [
    { key: 'name', header: 'Name' },
    {
      key: 'discount',
      header: 'Discount',
      render: (_, p: Promotion) => p.discountPct ? `${p.discountPct}%` : p.discountAmt ? `${Number(p.discountAmt).toFixed(2)} EGP` : '-'
    },
    {
      key: 'period',
      header: 'Period',
      render: (_, p: Promotion) => `${p.startDate?.slice(0, 10) ?? ''} - ${p.endDate?.slice(0, 10) ?? '∞'}`
    },
    {
      key: 'budgetAmt',
      header: 'Budget',
      render: (_, p: Promotion) => p.budgetAmt ? `${Number(p.budgetAmt).toLocaleString()} EGP` : '-'
    },
    {
      key: 'incrementalRevenue',
      header: 'Revenue Impact',
      render: (_, p: Promotion) => p.incrementalRevenue ? `${Number(p.incrementalRevenue).toLocaleString()} EGP` : '-'
    },
    {
      key: 'roi',
      header: 'ROI',
      render: (_, p: Promotion) => p.roi ? `${p.roi}%` : '-'
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (_, p: Promotion) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            p.isActive
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {p.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: '_actions',
      header: '',
      className: 'w-24',
      render: (_, p: Promotion) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEditForm(p)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={`Edit ${p.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteItem(p)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${p.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )
    }
  ];

  if (error) return <ErrorState message={error} onRetry={() => void loadPromotions()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retail Promotions"
        description="Plan, track, and analyze promotional campaigns and discount impacts"
      >
        <Button onClick={openCreateForm}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Promotion
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            placeholder="Search promotions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : promotions.length === 0 ? (
        <EmptyState
          title="No promotions yet"
          description="Create your first promotional campaign to start tracking retail discounts"
          action={<Button onClick={openCreateForm}>Create Promotion</Button>}
        />
      ) : (
        <>
          <TableWrapper<Promotion>
            columns={columns}
            data={promotions}
            keyExtractor={(p) => p.id}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={20}
            onPageChange={setPage}
          />
        </>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              {editItem ? 'Edit Promotion' : 'New Promotion'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
                  {formError}
                </div>
              )}

              <div>
                <label htmlFor="promo-name" className="mb-1 block text-xs font-medium text-slate-600">Name *</label>
                <Input id="promo-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Sale 2025" />
              </div>

              <div>
                <label htmlFor="promo-desc" className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                <textarea
                  id="promo-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="promo-product" className="mb-1 block text-xs font-medium text-slate-600">Product</label>
                  <select
                    id="promo-product"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Products</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="promo-active" className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                  <select
                    id="promo-active"
                    value={isActive ? 'active' : 'inactive'}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="promo-disc-pct" className="mb-1 block text-xs font-medium text-slate-600">Discount %</label>
                  <Input id="promo-disc-pct" type="number" step="0.1" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} placeholder="e.g. 10" />
                </div>
                <div>
                  <label htmlFor="promo-disc-amt" className="mb-1 block text-xs font-medium text-slate-600">Discount Amount (EGP)</label>
                  <Input id="promo-disc-amt" type="number" step="0.01" value={discountAmt} onChange={(e) => setDiscountAmt(e.target.value)} placeholder="e.g. 50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="promo-start" className="mb-1 block text-xs font-medium text-slate-600">Start Date *</label>
                  <Input id="promo-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="promo-end" className="mb-1 block text-xs font-medium text-slate-600">End Date</label>
                  <Input id="promo-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="promo-budget" className="mb-1 block text-xs font-medium text-slate-600">Budget</label>
                  <Input id="promo-budget" type="number" step="0.01" value={budgetAmt} onChange={(e) => setBudgetAmt(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="promo-actual" className="mb-1 block text-xs font-medium text-slate-600">Actual Cost</label>
                  <Input id="promo-actual" type="number" step="0.01" value={actualCost} onChange={(e) => setActualCost(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="promo-rev" className="mb-1 block text-xs font-medium text-slate-600">Incremental Revenue</label>
                  <Input id="promo-rev" type="number" step="0.01" value={incrementalRevenue} onChange={(e) => setIncrementalRevenue(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={formLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? 'Saving...' : editItem ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteItem && (
        <ConfirmDialog
          open={deleteItem !== null}
          message={`Are you sure you want to delete "${deleteItem.name}"? This action cannot be undone.`}
          isLoading={deleteLoading}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  );
}
