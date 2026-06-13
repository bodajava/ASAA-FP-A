'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { boolBadge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { apiGet } from '@/lib/api';
import type { Column } from '@/components/ui/table-wrapper';
import type { BomRecipe, Product, Material, PaginatedResponse } from '@/types/api';
import { useAuth } from '@/lib/auth-context';
import { LockedState } from '@/components/ui/feedback-states';

const columns: Column<BomRecipe>[] = [
  {
    key: 'product',
    header: 'Product',
    render: (_, row) => row.product ? `[${row.product.sku}] ${row.product.name}` : row.productId,
  },
  { key: 'version', header: 'Version' },
  { key: 'outputQty', header: 'Output Qty', render: (v) => Number(v).toFixed(4) },
  { key: 'laborCost', header: 'Labor Cost', render: (v) => Number(v).toFixed(2) },
  { key: 'overheadCost', header: 'Overhead Cost', render: (v) => Number(v).toFixed(2) },
  {
    key: 'bomLines',
    header: 'Lines',
    render: (v) => {
      const arr = v as BomRecipe['bomLines'];
      return <span className="text-xs text-slate-500 font-semibold">{Array.isArray(arr) ? arr.length : 0} items</span>;
    },
  },
  { key: 'isActive', header: 'Status', render: (v) => boolBadge(Boolean(v)) },
];

interface FormBomLine {
  materialId: string;
  qtyPerOutput: number;
  unitCost?: number;
  wastagePct?: number;
}

// ---------------------------------------------------------------------------
// BOM Line sub-form row
// ---------------------------------------------------------------------------
interface BomLineRowProps {
  line: FormBomLine;
  index: number;
  materials: Material[];
  onChange: (index: number, updated: FormBomLine) => void;
  onRemove: (index: number) => void;
}

function BomLineRow({ line, index, materials, onChange, onRemove }: BomLineRowProps) {
  return (
    <div className="grid grid-cols-[1fr_80px_80px_32px] items-end gap-2">
      <div className="flex flex-col gap-1.5">
        {index === 0 && <label htmlFor={`bom-line-mat-${index}`} className="text-xs font-semibold text-slate-500">Material</label>}
        <select
          id={`bom-line-mat-${index}`}
          value={line.materialId}
          onChange={(e) => onChange(index, { ...line, materialId: e.target.value })}
          className="h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          required
        >
          <option value="">Select material...</option>
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
        label={index === 0 ? 'Qty/Output' : ''}
        value={line.qtyPerOutput.toString()}
        onChange={(e) => onChange(index, { ...line, qtyPerOutput: Number(e.target.value) })}
        placeholder="1"
        required
      />
      <Input
        id={`bom-line-cost-${index}`}
        type="number"
        step="0.01"
        label={index === 0 ? 'Unit Cost' : ''}
        value={(line.unitCost ?? '').toString()}
        onChange={(e) =>
          onChange(index, { ...line, unitCost: e.target.value ? Number(e.target.value) : undefined })
        }
        placeholder="0.00"
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="mb-0.5 flex h-9 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:text-red-500 cursor-pointer"
        aria-label={`Remove line ${index + 1}`}
        title="Remove Line"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------
interface FormProps {
  item: BomRecipe | null;
  onClose: () => void;
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

function BomRecipeForm({ item, onClose, onSubmit, isLoading }: FormProps) {
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

  // Load Products & Materials metadata
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
        toastError('Failed to load products and materials list for recipe configuration.');
      }
    }
    void loadMeta();
  }, [toastError]);

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

    // Client-side validations
    if (!productId) {
      toastError('Please select a target product.');
      return;
    }
    if (bomLines.length === 0) {
      toastError('BOM Recipe requires at least one material line.');
      return;
    }
    for (let i = 0; i < bomLines.length; i++) {
      const line = bomLines[i];
      if (!line.materialId) {
        toastError(`BOM Line #${i + 1} is missing a material selection.`);
        return;
      }
      if (line.qtyPerOutput <= 0) {
        toastError(`BOM Line #${i + 1} must have a quantity per output greater than 0.`);
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
        <label htmlFor="bom-product-select" className="text-xs font-semibold text-slate-500">Product</label>
        <select
          id="bom-product-select"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          required
        >
          <option value="">Select a product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.sku}] {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input id="bom-version" label="Version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1" />
        <Input id="bom-output-qty" type="number" label="Output Qty" value={outputQty} onChange={(e) => setOutputQty(e.target.value)} placeholder="1" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input id="bom-wastage" type="number" label="Wastage %" value={wastagePct} onChange={(e) => setWastagePct(e.target.value)} placeholder="0" />
        <Input id="bom-labor" type="number" label="Labor Cost" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} placeholder="0" />
        <Input id="bom-overhead" type="number" label="Overhead Cost" value={overheadCost} onChange={(e) => setOverheadCost(e.target.value)} placeholder="0" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-slate-300 accent-emerald-600" />
        Active
      </label>

      {/* BOM Lines */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">BOM Lines</span>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 cursor-pointer"
            title="Add Material Line"
          >
            <Plus className="h-3 w-3" /> Add Line
          </button>
        </div>
        {bomLines.length === 0 ? (
          <p className="text-center text-xs text-slate-400">No lines yet. Click &ldquo;Add Line&rdquo; to add materials.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bomLines.map((line, i) => (
              <BomLineRow key={i} line={line} index={i} materials={materials} onChange={updateLine} onRemove={removeLine} />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 font-semibold">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Create Recipe'}</Button>
      </div>
    </form>
  );
}

export default function BomRecipesPage() {
  const { tenant } = useAuth();
  const planName = tenant?.plan?.name?.toLowerCase() || 'starter';

  if (planName === 'starter' || planName === 'business') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">BOM Recipes</h1>
          <p className="text-sm text-slate-500">Bill of Materials recipes defining product manufacturing inputs</p>
        </div>
        <LockedState
          title="BOM Recipes is Locked"
          description="BOM recipes and factory requirement planning are exclusive to the Enterprise tier. Get full access to BOM explosion calculations, raw materials requirements, wastage tracking, and production forecasting."
          requiredPlan="Enterprise"
        />
      </div>
    );
  }

  return (
    <CrudPage<BomRecipe>
      title="BOM Recipes"
      importModule="bom-recipes"
      description="Bill of Materials recipes defining product manufacturing inputs"
      endpoint="/bom-recipes"
      columns={columns}
      emptyTitle="No BOM recipes yet"
      emptyDescription="Add BOM recipes to calculate product costs from raw materials."
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <BomRecipeForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
