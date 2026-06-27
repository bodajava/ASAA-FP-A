'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ArrowLeftRight } from 'lucide-react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { boolBadge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { apiGet } from '@/lib/api';
import { useI18n } from '@/lib/i18n/i18n-context';
import { BomCompareModal } from '@/components/bom-compare-modal';
import { Modal } from '@/components/ui/modal';
import type { Column } from '@/components/ui/table-wrapper';
import type { BomRecipe, Product, Material, PaginatedResponse } from '@/types/api';

interface FormBomLine {
  materialId: string;
  qtyPerOutput: number;
  unitCost?: number;
  wastagePct?: number;
  yieldPct?: number;
  costCategory?: string;
}

interface BomLineRowProps {
  line: FormBomLine;
  index: number;
  materials: Material[];
  onChange: (index: number, updated: FormBomLine) => void;
  onRemove: (index: number) => void;
}

function BomLineRow({ line, index, materials, onChange, onRemove }: BomLineRowProps) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-[2fr_1.2fr_100px_90px_90px_90px_32px] items-end gap-2 text-xs">
      {/* 1. Material Select */}
      <div className="flex flex-col gap-1">
        {index === 0 && <label htmlFor={`bom-line-mat-${index}`} className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('page.bomRecipes.material')}</label>}
        <select
          id={`bom-line-mat-${index}`}
          value={line.materialId}
          onChange={(e) => onChange(index, { ...line, materialId: e.target.value })}
          className="h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          required
        >
          <option value="">{t('page.bomRecipes.selectMaterial')}</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              [{m.code}] {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Cost Category Select */}
      <div className="flex flex-col gap-1">
        {index === 0 && <label htmlFor={`bom-line-cat-${index}`} className="text-xs font-semibold text-slate-500 dark:text-slate-400">Category</label>}
        <select
          id={`bom-line-cat-${index}`}
          value={line.costCategory || 'Raw Material'}
          onChange={(e) => onChange(index, { ...line, costCategory: e.target.value })}
          className="h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          required
        >
          <option value="Raw Material">Raw Material</option>
          <option value="Packaging">Packaging</option>
          <option value="Manufacturing">Manufacturing</option>
          <option value="Logistics">Logistics</option>
          <option value="Selling">Selling</option>
        </select>
      </div>

      {/* 3. Qty Per Output */}
      <Input
        id={`bom-line-qty-${index}`}
        type="number"
        step="0.0001"
        min="0.0001"
        label={index === 0 ? t('page.bomRecipes.qtyPerOutput') : ''}
        value={line.qtyPerOutput.toString()}
        onChange={(e) => onChange(index, { ...line, qtyPerOutput: Number(e.target.value) })}
        placeholder="1"
        required
      />

      {/* 4. Custom Unit Cost */}
      <Input
        id={`bom-line-cost-${index}`}
        type="number"
        step="0.01"
        label={index === 0 ? t('page.bomRecipes.unitCost') : ''}
        value={(line.unitCost ?? '').toString()}
        onChange={(e) =>
          onChange(index, { ...line, unitCost: e.target.value ? Number(e.target.value) : undefined })
        }
        placeholder="0.00"
      />

      {/* 5. Line wastage % */}
      <Input
        id={`bom-line-waste-${index}`}
        type="number"
        step="0.1"
        min="0"
        max="100"
        label={index === 0 ? 'Waste %' : ''}
        value={(line.wastagePct ?? '0').toString()}
        onChange={(e) =>
          onChange(index, { ...line, wastagePct: e.target.value ? Number(e.target.value) : 0 })
        }
        placeholder="0"
      />

      {/* 6. Line yield % */}
      <Input
        id={`bom-line-yield-${index}`}
        type="number"
        step="0.1"
        min="0.1"
        max="100"
        label={index === 0 ? 'Yield %' : ''}
        value={(line.yieldPct ?? '100').toString()}
        onChange={(e) =>
          onChange(index, { ...line, yieldPct: e.target.value ? Number(e.target.value) : 100 })
        }
        placeholder="100"
      />

      {/* 7. Action Button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="mb-0.5 flex h-9 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:text-red-500 cursor-pointer dark:border-slate-700 dark:bg-slate-800"
        aria-label={`${t('page.bomRecipes.removeLine')} ${index + 1}`}
        title={t('page.bomRecipes.removeLine')}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface FormProps {
  item: BomRecipe | null;
  onClose: () => void;
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

function BomRecipeForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
  const { error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const [productId, setProductId] = useState(item?.productId ?? '');
  const [version, setVersion] = useState(item?.version ?? 'v1');
  const [outputQty, setOutputQty] = useState(item?.outputQty?.toString() ?? '1');
  const [wastagePct, setWastagePct] = useState(item?.wastagePct?.toString() ?? '0');
  const [laborCost, setLaborCost] = useState(item?.laborCost?.toString() ?? '0');
  const [overheadCost, setOverheadCost] = useState(item?.overheadCost?.toString() ?? '0');
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [bomLines, setBomLines] = useState<FormBomLine[]>(
    item?.bomLines?.map((l) => ({
      materialId: l.materialId,
      qtyPerOutput: (l as unknown as { qtyPerOutput?: number }).qtyPerOutput ?? l.qty,
      unitCost: l.unitCost,
      wastagePct: l.wastagePct,
      yieldPct: (l as any).yieldPct ?? 100,
      costCategory: (l as any).costCategory ?? 'Raw Material',
    })) ?? [],
  );

  useEffect(() => {
    async function loadMeta() {
      try {
        const [prodRes, matRes] = await Promise.all([
          apiGet<PaginatedResponse<Product>>('/products?limit=1000'),
          apiGet<PaginatedResponse<Material>>('/materials?limit=1000'),
        ]);
        setProducts(prodRes.data ?? []);
        setMaterials(matRes.data ?? []);
      } catch {
        toastError(t('page.bomRecipes.loadMetaError'));
      }
    }
    void loadMeta();
  }, [toastError, t]);

  function addLine() {
    setBomLines((prev) => [
      ...prev,
      { materialId: '', qtyPerOutput: 1, wastagePct: 0, yieldPct: 100, costCategory: 'Raw Material' },
    ]);
  }

  function updateLine(index: number, updated: FormBomLine) {
    setBomLines((prev) => prev.map((l, i) => (i === index ? updated : l)));
  }

  function removeLine(index: number) {
    setBomLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!productId) {
      toastError(t('page.bomRecipes.noProductError'));
      return;
    }
    if (bomLines.length === 0) {
      toastError(t('page.bomRecipes.noLinesError'));
      return;
    }
    for (let i = 0; i < bomLines.length; i++) {
      const line = bomLines[i];
      if (!line.materialId) {
        toastError(`${t('page.bomRecipes.linePrefix')} ${i + 1}: ${t('page.bomRecipes.noMaterialError')}`);
        return;
      }
      if (line.qtyPerOutput <= 0) {
        toastError(`${t('page.bomRecipes.linePrefix')} ${i + 1}: ${t('page.bomRecipes.qtyError')}`);
        return;
      }
    }

    await onSubmit({
      productId,
      version,
      outputQty: Number(outputQty),
      wastagePct: Number(wastagePct),
      laborCost: Number(laborCost),
      overheadCost: Number(overheadCost),
      isActive,
      bomLines: bomLines.map((line) => ({
        materialId: line.materialId,
        qtyPerOutput: Number(line.qtyPerOutput),
        unitCost: line.unitCost ? Number(line.unitCost) : 0,
        wastagePct: line.wastagePct ? Number(line.wastagePct) : 0,
        yieldPct: line.yieldPct ? Number(line.yieldPct) : 100,
        costCategory: line.costCategory || 'Raw Material',
      })),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bom-product-select" className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('page.bomRecipes.product')}</label>
        <select
          id="bom-product-select"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          required
        >
          <option value="">{t('page.bomRecipes.selectProduct')}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.sku}] {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input id="bom-version" label={t('page.bomRecipes.version')} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1" />
        <Input id="bom-output-qty" type="number" label={t('page.bomRecipes.outputQty')} value={outputQty} onChange={(e) => setOutputQty(e.target.value)} placeholder="1" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input id="bom-wastage" type="number" label={t('page.bomRecipes.wastagePct')} value={wastagePct} onChange={(e) => setWastagePct(e.target.value)} placeholder="0" />
        <Input id="bom-labor" type="number" label={t('page.bomRecipes.laborCost')} value={laborCost} onChange={(e) => setLaborCost(e.target.value)} placeholder="0" />
        <Input id="bom-overhead" type="number" label={t('page.bomRecipes.overheadCost')} value={overheadCost} onChange={(e) => setOverheadCost(e.target.value)} placeholder="0" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-slate-300 accent-emerald-600 dark:border-slate-600" />
        {t('common.active')}
      </label>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('page.bomRecipes.bomLinesSection')}</span>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 cursor-pointer dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
            title={t('page.bomRecipes.addLine')}
          >
            <Plus className="h-3 w-3" /> {t('page.bomRecipes.addLine')}
          </button>
        </div>
        {bomLines.length === 0 ? (
          <p className="text-center text-xs text-slate-400">{t('page.bomRecipes.noLinesText')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bomLines.map((line, i) => (
              <BomLineRow key={i} line={line} index={i} materials={materials} onChange={updateLine} onRemove={removeLine} />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 font-semibold dark:border-slate-700">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? t('common.saveChanges') : t('page.bomRecipes.createRecipe')}</Button>
      </div>
    </form>
  );
}

// Helper calculation function for rows
function calculateBomShares(recipe: BomRecipe) {
  let materialCost = 0;
  let packagingCost = 0;
  const lines = recipe.bomLines || [];
  
  lines.forEach((line: any) => {
    const qty = Number(line.qtyPerOutput);
    const unitCost = Number(line.unitCost || line.material?.purchasePrice || 0);
    const waste = Number(line.wastagePct || 0);
    const yieldPct = Number(line.yieldPct || 100);
    const lineCost = (qty * unitCost * (1 + waste/100)) / (yieldPct/100);
    
    const cat = String(line.costCategory || '').toLowerCase();
    if (cat.includes('pack')) {
      packagingCost += lineCost;
    } else {
      materialCost += lineCost;
    }
  });

  const labor = Number(recipe.laborCost || 0);
  const overhead = Number(recipe.overheadCost || 0);
  const totalRecipeCost = (materialCost + packagingCost + labor + overhead) * (1 + Number(recipe.wastagePct || 0)/100);
  const costPerUnit = recipe.outputQty > 0 ? totalRecipeCost / Number(recipe.outputQty) : 0;
  
  const totalMatPack = materialCost + packagingCost || 1;
  const materialPct = (materialCost / totalMatPack) * 100;
  const packagingPct = (packagingCost / totalMatPack) * 100;

  return {
    totalRecipeCost,
    costPerUnit,
    materialPct,
    packagingPct,
    yieldPct: 100 - Number(recipe.wastagePct || 0),
    wastePct: Number(recipe.wastagePct || 0),
  };
}

export default function BomRecipesPage() {
  const { t, locale } = useI18n();
  const [compareRecipeId, setCompareRecipeId] = useState<string | null>(null);

  const columns: Column<BomRecipe>[] = useMemo(() => [
    {
      key: 'product',
      header: t('page.bomRecipes.product'),
      render: (_, row) => row.product ? `[${row.product.sku}] ${row.product.name}` : row.productId,
    },
    { key: 'version', header: t('page.bomRecipes.version') },
    {
      key: 'yieldPct',
      header: 'Yield %',
      render: (_, row) => {
        const metrics = calculateBomShares(row);
        return `${metrics.yieldPct.toFixed(1)}%`;
      }
    },
    {
      key: 'wastePct',
      header: 'Waste %',
      render: (_, row) => {
        const metrics = calculateBomShares(row);
        return `${metrics.wastePct.toFixed(1)}%`;
      }
    },
    {
      key: 'materialPct',
      header: 'Material %',
      render: (_, row) => {
        const metrics = calculateBomShares(row);
        return `${metrics.materialPct.toFixed(0)}%`;
      }
    },
    {
      key: 'packagingPct',
      header: 'Packaging %',
      render: (_, row) => {
        const metrics = calculateBomShares(row);
        return `${metrics.packagingPct.toFixed(0)}%`;
      }
    },
    {
      key: 'estimatedCost',
      header: 'Total Cost',
      render: (_, row) => {
        const metrics = calculateBomShares(row);
        return `$${metrics.totalRecipeCost.toFixed(2)}`;
      }
    },
    {
      key: 'estimatedCostPerUnit',
      header: 'Cost per Unit',
      render: (_, row) => {
        const metrics = calculateBomShares(row);
        return `$${metrics.costPerUnit.toFixed(4)}`;
      }
    },
    {
      key: 'createdAt',
      header: 'Effective Date',
      render: (v) => v ? new Date(String(v)).toLocaleDateString() : '—'
    },
    { key: 'isActive', header: t('common.status'), render: (v) => boolBadge(Boolean(v)) },
  ], [t]);

  return (
    <>
      <CrudPage<BomRecipe>
        title={t('page.bomRecipes.title')}
        importModule="bom-recipes"
        description={t('page.bomRecipes.description')}
        endpoint="/bom-recipes"
        columns={columns}
        emptyTitle={t('page.bomRecipes.emptyTitle')}
        emptyDescription={t('page.bomRecipes.emptyDescription')}
        extraRowActions={(item) => (
          <button
            onClick={() => setCompareRecipeId(item.id)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 cursor-pointer"
            title={locale === 'ar' ? 'مقارنة إصدارات الوصفة' : 'Compare Recipe Versions'}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>
        )}
        renderForm={({ item, onClose, onSubmit, isLoading }) => (
          <BomRecipeForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
        )}
      />

      {compareRecipeId && (
        <Modal
          open={compareRecipeId !== null}
          onClose={() => setCompareRecipeId(null)}
          title={locale === 'ar' ? 'مقارنة إصدارات وصفة الإنتاج' : 'Compare Production Recipe Versions'}
          size="xl"
        >
          <BomCompareModal
            recipeId={compareRecipeId}
            onClose={() => setCompareRecipeId(null)}
          />
        </Modal>
      )}
    </>
  );
}
