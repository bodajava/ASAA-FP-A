'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { apiGet } from '@/lib/api';
import { useI18n } from '@/lib/i18n/i18n-context';
import { LoadingState } from './ui/feedback-states';
import { Button } from './ui/button';
import { Scale, ArrowRight, ArrowLeftRight, Check, AlertTriangle } from 'lucide-react';

interface BomLine {
  id: string;
  materialId: string;
  qtyPerOutput: number;
  unitCost: number;
  wastagePct: number;
  yieldPct: number;
  costCategory: string | null;
  material: {
    id: string;
    name: string;
    code: string;
    purchasePrice: number;
  };
}

interface BomRecipe {
  id: string;
  productId: string;
  version: string | null;
  outputQty: number;
  wastagePct: number;
  laborCost: number;
  overheadCost: number;
  isActive: boolean;
  createdAt: string | null;
  bomLines: BomLine[];
  product?: {
    id: string;
    name: string;
    sku: string;
  };
}

interface BomCompareModalProps {
  recipeId: string;
  onClose: () => void;
}

export function BomCompareModal({ recipeId, onClose }: BomCompareModalProps) {
  const { t, locale } = useI18n();
  const isRtl = locale === 'ar';

  const [recipeA, setRecipeA] = useState<BomRecipe | null>(null);
  const [recipeB, setRecipeB] = useState<BomRecipe | null>(null);
  const [otherRecipes, setOtherRecipes] = useState<BomRecipe[]>([]);
  const [selectedRecipeBId, setSelectedRecipeBId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecipes() {
      setIsLoading(true);
      setError(null);
      try {
        // Load original recipe
        const currentRecipe = await apiGet<BomRecipe>(`/bom-recipes/${recipeId}`);
        setRecipeA(currentRecipe);

        // Load all recipes for the same product to allow comparison
        const allRecipesResponse = await apiGet<{ data: BomRecipe[] }>(
          `/bom-recipes?product_id=${currentRecipe.productId}&limit=100`
        );
        const filtered = (allRecipesResponse.data ?? []).filter((r) => r.id !== recipeId);
        setOtherRecipes(filtered);

        if (filtered.length > 0) {
          setSelectedRecipeBId(filtered[0].id);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load recipe details');
      } finally {
        setIsLoading(false);
      }
    }
    void loadRecipes();
  }, [recipeId]);

  useEffect(() => {
    if (!selectedRecipeBId) return;
    async function loadRecipeB() {
      try {
        const recipe = await apiGet<BomRecipe>(`/bom-recipes/${selectedRecipeBId}`);
        setRecipeB(recipe);
      } catch (err: unknown) {
        console.error('Failed to load comparison recipe', err);
      }
    }
    void loadRecipeB();
  }, [selectedRecipeBId]);

  // Helper calculation function
  const metricsA = useMemo(() => recipeA ? calculateRecipeMetrics(recipeA) : null, [recipeA]);
  const metricsB = useMemo(() => recipeB ? calculateRecipeMetrics(recipeB) : null, [recipeB]);

  function calculateRecipeMetrics(recipe: BomRecipe) {
    let materialCost = 0;
    let packagingCost = 0;
    
    recipe.bomLines.forEach((line) => {
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
      materialCost,
      packagingCost,
      labor,
      overhead,
      totalRecipeCost,
      costPerUnit,
      materialPct,
      packagingPct,
      yieldPct: 100 - Number(recipe.wastagePct || 0),
    };
  }

  // Side-by-side BOM Line comparison
  const bomLinesComparison = useMemo(() => {
    if (!recipeA || !recipeB) return [];
    
    const allMaterialsMap = new Map<string, { name: string; code: string; unit: string }>();
    recipeA.bomLines.forEach((line) => {
      allMaterialsMap.set(line.materialId, {
        name: line.material.name,
        code: line.material.code,
        unit: 'Unit', // fallback
      });
    });
    recipeB.bomLines.forEach((line) => {
      allMaterialsMap.set(line.materialId, {
        name: line.material.name,
        code: line.material.code,
        unit: 'Unit',
      });
    });

    return Array.from(allMaterialsMap.entries()).map(([materialId, info]) => {
      const lineA = recipeA.bomLines.find((l) => l.materialId === materialId);
      const lineB = recipeB.bomLines.find((l) => l.materialId === materialId);

      const qtyA = lineA ? Number(lineA.qtyPerOutput) : 0;
      const qtyB = lineB ? Number(lineB.qtyPerOutput) : 0;
      const costA = lineA ? Number(lineA.unitCost || lineA.material.purchasePrice || 0) : 0;
      const costB = lineB ? Number(lineB.unitCost || lineB.material.purchasePrice || 0) : 0;
      const wasteA = lineA ? Number(lineA.wastagePct || 0) : 0;
      const wasteB = lineB ? Number(lineB.wastagePct || 0) : 0;
      
      const totalA = lineA ? (qtyA * costA * (1 + wasteA/100)) / ((lineA.yieldPct || 100)/100) : 0;
      const totalB = lineB ? (qtyB * costB * (1 + wasteB/100)) / ((lineB.yieldPct || 100)/100) : 0;
      const diff = totalB - totalA;

      return {
        materialId,
        name: info.name,
        code: info.code,
        lineA: lineA ? { qty: qtyA, cost: costA, waste: wasteA, yield: lineA.yieldPct || 100, category: lineA.costCategory, total: totalA } : null,
        lineB: lineB ? { qty: qtyB, cost: costB, waste: wasteB, yield: lineB.yieldPct || 100, category: lineB.costCategory, total: totalB } : null,
        diff,
      };
    });
  }, [recipeA, recipeB]);

  if (isLoading) {
    return (
      <div className="flex h-[450px] items-center justify-center">
        <LoadingState rows={6} />
      </div>
    );
  }

  if (error || !recipeA) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center p-6 text-center text-red-500">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p className="text-sm">{error ?? 'Recipe details could not be loaded'}</p>
        <Button onClick={onClose} variant="outline" className="mt-4">{t('common.cancel')}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] overflow-hidden text-slate-800 dark:text-slate-100">
      
      {/* Selector & Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl mb-6 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{isRtl ? 'المنتج للمقارنة' : 'Product under Comparison'}</span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{recipeA.product?.name}</h3>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500">{isRtl ? 'قارن مع الإصدار:' : 'Compare with Version:'}</span>
          {otherRecipes.length === 0 ? (
            <span className="text-xs text-slate-400 bg-white dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200">{isRtl ? 'لا توجد إصدارات أخرى' : 'No other recipe versions'}</span>
          ) : (
            <select
              value={selectedRecipeBId}
              onChange={(e) => setSelectedRecipeBId(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              {otherRecipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.version} {r.isActive ? (isRtl ? '(نشط)' : '(Active)') : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {recipeB && metricsA && metricsB ? (
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          
          {/* Metrics comparison grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Version A card */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 dark:border-emerald-950/40 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">{isRtl ? 'الإصدار أ' : 'Version A'} ({recipeA.version})</span>
                {recipeA.isActive && <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full">{isRtl ? 'نشط' : 'Active'}</span>}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'التكلفة الكلية' : 'Total Recipe Cost'}</span>
                  <span className="font-semibold">${metricsA.totalRecipeCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'التكلفة للوحدة' : 'Cost per Unit'}</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">${metricsA.costPerUnit.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'نسبة الفاقد' : 'Recipe Waste %'}</span>
                  <span>{recipeA.wastagePct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'المواد / التعبئة %' : 'Material / Packaging %'}</span>
                  <span className="font-medium text-emerald-700">{metricsA.materialPct.toFixed(0)}% / {metricsA.packagingPct.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Scale comparison middle column */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950 flex flex-col justify-center items-center text-center">
              <ArrowLeftRight className="h-6 w-6 text-emerald-600 mb-2" />
              <p className="text-xs font-bold text-slate-500">{isRtl ? 'تغير التكلفة للوحدة' : 'Unit Cost Variance'}</p>
              {(() => {
                const diff = metricsB.costPerUnit - metricsA.costPerUnit;
                const diffPct = metricsA.costPerUnit > 0 ? (diff / metricsA.costPerUnit) * 100 : 0;
                return (
                  <div className="mt-2">
                    <p className={`text-lg font-black ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(4)}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diff > 0 ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'}`}>
                      {diff > 0 ? '+' : ''}{diffPct.toFixed(1)}%
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Version B card */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/20 dark:border-blue-950/40 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-blue-800 dark:text-blue-400">{isRtl ? 'الإصدار ب' : 'Version B'} ({recipeB.version})</span>
                {recipeB.isActive && <span className="text-[10px] bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">{isRtl ? 'نشط' : 'Active'}</span>}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'التكلفة الكلية' : 'Total Recipe Cost'}</span>
                  <span className="font-semibold">${metricsB.totalRecipeCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'التكلفة للوحدة' : 'Cost per Unit'}</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">${metricsB.costPerUnit.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'نسبة الفاقد' : 'Recipe Waste %'}</span>
                  <span>{recipeB.wastagePct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'المواد / التعبئة %' : 'Material / Packaging %'}</span>
                  <span className="font-medium text-blue-700">{metricsB.materialPct.toFixed(0)}% / {metricsB.packagingPct.toFixed(0)}%</span>
                </div>
              </div>
            </div>

          </div>

          {/* BOM lines detail table compare */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{isRtl ? 'مقارنة خطوط المواد (BOM Lines Comparison)' : 'Material BOM Line-by-Line Comparison'}</h4>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase">
                    <th className="px-4 py-2.5">{isRtl ? 'المادة الخام' : 'Material'}</th>
                    <th className="px-4 py-2.5">{isRtl ? 'التصنيف' : 'Category'}</th>
                    <th className="px-4 py-2.5 text-center">{isRtl ? 'كمية (أ)' : 'Qty (A)'}</th>
                    <th className="px-4 py-2.5 text-center">{isRtl ? 'كمية (ب)' : 'Qty (B)'}</th>
                    <th className="px-4 py-2.5 text-right">{isRtl ? 'تكلفة (أ)' : 'Total (A)'}</th>
                    <th className="px-4 py-2.5 text-right">{isRtl ? 'تكلفة (ب)' : 'Total (B)'}</th>
                    <th className="px-4 py-2.5 text-right">{isRtl ? 'الفارق' : 'Variance'}</th>
                  </tr>
                </thead>
                <tbody>
                  {bomLinesComparison.map((row) => (
                    <tr key={row.materialId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{row.name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{row.code}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 capitalize">{row.lineA?.category || row.lineB?.category || 'Material'}</td>
                      <td className="px-4 py-3 text-center font-mono font-medium">{row.lineA ? row.lineA.qty.toFixed(4) : '—'}</td>
                      <td className="px-4 py-3 text-center font-mono font-medium">{row.lineB ? row.lineB.qty.toFixed(4) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono">${row.lineA ? row.lineA.total.toFixed(3) : '0.000'}</td>
                      <td className="px-4 py-3 text-right font-mono">${row.lineB ? row.lineB.total.toFixed(3) : '0.000'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {row.diff === 0 ? (
                          <span className="text-slate-400">0.000</span>
                        ) : (
                          <span className={row.diff > 0 ? 'text-red-600' : 'text-emerald-600'}>
                            {row.diff > 0 ? '+' : ''}{row.diff.toFixed(3)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        <div className="flex h-[350px] items-center justify-center text-slate-400">
          <AlertTriangle className="h-6 w-6 mr-2 opacity-50" />
          <p>{isRtl ? 'يرجى اختيار إصدار مقارنة صالح' : 'Please select a valid version to compare'}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 flex justify-end">
        <Button onClick={onClose} variant="outline" size="sm">
          {isRtl ? 'إغلاق' : 'Close'}
        </Button>
      </div>

    </div>
  );
}
