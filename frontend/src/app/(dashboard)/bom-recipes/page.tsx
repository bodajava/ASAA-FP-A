'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { boolBadge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { apiGet } from '@/lib/api';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { BomRecipe, Product, Material, PaginatedResponse } from '@/types/api';
import { useAuth } from '@/lib/auth-context';
import { LockedState } from '@/components/ui/feedback-states';

interface FormBomLine {
  materialId: string;
  qtyPerOutput: number;
  unitCost?: number;
  wastagePct?: number;
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
    <div className="grid grid-cols-[1fr_80px_80px_32px] items-end gap-2">
      <div className="flex flex-col gap-1.5">
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
    setBomLines((prev) => [...prev, { materialId: '', qtyPerOutput: 1, wastagePct: 0 }]);
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

export default function BomRecipesPage() {
  const { tenant } = useAuth();
  const { t } = useI18n();
  const planName = tenant?.plan?.name?.toLowerCase() || 'starter';

  if (planName === 'starter' || planName === 'business') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('page.bomRecipes.title')}</h1>
          <p className="text-sm text-slate-500">{t('page.bomRecipes.description')}</p>
        </div>
        <LockedState
          title={t('page.bomRecipes.lockedTitle')}
          description={t('page.bomRecipes.lockedDescription')}
          requiredPlan="Enterprise"
        />
      </div>
    );
  }

  const columns: Column<BomRecipe>[] = useMemo(() => [
    {
      key: 'product',
      header: t('page.bomRecipes.product'),
      render: (_, row) => row.product ? `[${row.product.sku}] ${row.product.name}` : row.productId,
    },
    { key: 'version', header: t('page.bomRecipes.version') },
    { key: 'outputQty', header: t('page.bomRecipes.outputQty'), render: (v) => Number(v).toFixed(4) },
    { key: 'laborCost', header: t('page.bomRecipes.laborCost'), render: (v) => Number(v).toFixed(2) },
    { key: 'overheadCost', header: t('page.bomRecipes.overheadCost'), render: (v) => Number(v).toFixed(2) },
    {
      key: 'bomLines',
      header: t('page.bomRecipes.linesHeader'),
      render: (v) => {
        const arr = v as BomRecipe['bomLines'];
        return <span className="text-xs text-slate-500 font-semibold dark:text-slate-400">{Array.isArray(arr) ? arr.length : 0} {t('page.bomRecipes.itemsUnit')}</span>;
      },
    },
    { key: 'isActive', header: t('common.status'), render: (v) => boolBadge(Boolean(v)) },
  ], [t]);

  return (
    <CrudPage<BomRecipe>
      title={t('page.bomRecipes.title')}
      importModule="bom-recipes"
      description={t('page.bomRecipes.description')}
      endpoint="/bom-recipes"
      columns={columns}
      emptyTitle={t('page.bomRecipes.emptyTitle')}
      emptyDescription={t('page.bomRecipes.emptyDescription')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <BomRecipeForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
