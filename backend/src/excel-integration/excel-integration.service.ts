/**
 * Excel Integration Orchestrator Service
 *
 * Coordinates the entire Excel-first import workflow:
 *   1. Analyze workbook structure
 *   2. Map sheets to ERP modules
 *   3. Validate all data
 *   4. Import in dependency order
 *   5. Generate comprehensive reports
 */

import { Injectable, Logger } from '@nestjs/common';
import { ExcelAnalyzerService } from './excel-analyzer.service';
import { ColumnMatcherService } from './column-matcher.service';
import { ValidationEngineService } from './validation-engine.service';
import { ErpModuleMapperService } from './erp-module-mapper.service';
import { StreamingImportService } from './streaming-import.service';
import {
  WorkbookAnalysis, SheetAnalysis, ErpModuleMapping, ColumnMapping,
  SheetValidationResult, ImportExecutionResult, ImportPlan, ImportSheetPlan,
  AnalysisWarning,
} from './types/excel-integration.types';
import * as XLSX from 'xlsx';

@Injectable()
export class ExcelIntegrationService {
  private readonly logger = new Logger(ExcelIntegrationService.name);

  constructor(
    private readonly analyzer: ExcelAnalyzerService,
    private readonly matcher: ColumnMatcherService,
    private readonly validator: ValidationEngineService,
    private readonly mapper: ErpModuleMapperService,
    private readonly importer: StreamingImportService,
  ) {}

  /* ─── Phase 1: Analyze Workbook ────────────────────────────────────── */

  analyzeWorkbook(buffer: Buffer, fileName: string): WorkbookAnalysis {
    this.logger.log(`Phase 1: Analyzing workbook "${fileName}"`);
    return this.analyzer.analyzeWorkbook(buffer, fileName);
  }

  /* ─── Phase 2: Map to ERP Modules ──────────────────────────────────── */

  mapToModules(analysis: WorkbookAnalysis): {
    mappings: ErpModuleMapping[];
    warnings: AnalysisWarning[];
  } {
    this.logger.log(`Phase 2: Mapping ${analysis.sheets.length} sheets to ERP modules`);

    const mappings = this.mapper.mapSheetsToModules(analysis.sheets);
    const warnings: AnalysisWarning[] = [...analysis.warnings];

    // Add warnings for unknown modules
    for (const m of mappings) {
      if (m.module === 'unknown') {
        warnings.push({
          type: 'orphan_data',
          message: `Sheet "${m.sheetName}" could not be mapped to any ERP module`,
          suggestion: `Manually map this sheet or rename it to match a known module (e.g., "Products", "Customers")`,
        });
      }
    }

    return { mappings, warnings };
  }

  /* ─── Phase 3: Validate All Data ───────────────────────────────────── */

  validateWorkbook(
    buffer: Buffer,
    analysis: WorkbookAnalysis,
  ): SheetValidationResult[] {
    this.logger.log(`Phase 3: Validating data across ${analysis.sheets.length} sheets`);

    const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: false });
    const results: SheetValidationResult[] = [];

    for (const sheet of analysis.sheets) {
      const ws = workbook.Sheets[sheet.sheetName];
      if (!ws) continue;

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      const result = this.validator.validateSheet(sheet.sheetName, rows, sheet);
      results.push(result);
    }

    return results;
  }

  /* ─── Phase 4: Build Import Plan ───────────────────────────────────── */

  buildImportPlan(
    analysis: WorkbookAnalysis,
    mappings: ErpModuleMapping[],
    validations: SheetValidationResult[],
  ): ImportPlan {
    this.logger.log(`Phase 4: Building import plan`);

    const validationMap = new Map(validations.map(v => [v.sheetName, v]));
    const mappingMap = new Map(mappings.map(m => [m.sheetName, m]));

    const sheets: ImportSheetPlan[] = analysis.importOrder
      .map(sheetName => {
        const sheetAnalysis = analysis.sheets.find(s => s.sheetName === sheetName);
        const mapping = mappingMap.get(sheetName);
        const validation = validationMap.get(sheetName);

        if (!sheetAnalysis || !mapping) return null;

        const columnMap: Record<string, string> = {};
        for (const cm of mapping.columnMappings) {
          if (cm.type !== 'skip') {
            columnMap[cm.excelColumn] = cm.erpField;
          }
        }

        return {
          sheetName,
          erpModule: mapping.module,
          columnMap,
          rowCount: validation?.validRows || 0,
          order: sheetAnalysis.importOrder,
          skipErrors: false,
        };
      })
      .filter((s): s is ImportSheetPlan => s !== null);

    const totalRows = sheets.reduce((sum, s) => sum + s.rowCount, 0);
    const estimatedDurationMs = (totalRows / 1000) * 100; // Rough estimate: 100ms per 1000 rows

    return { sheets, totalRows, estimatedDurationMs };
  }

  /* ─── Phase 5: Execute Import ──────────────────────────────────────── */

  async executeImport(
    buffer: Buffer,
    analysis: WorkbookAnalysis,
    mappings: ErpModuleMapping[],
    validations: SheetValidationResult[],
    companyId: number,
    options?: { dryRun?: boolean; skipErrors?: boolean; userColumnOverrides?: Record<string, Record<string, string>>; userId?: bigint | null },
  ): Promise<ImportExecutionResult> {
    this.logger.log(`Phase 5: Executing import for company ${companyId}`);

    const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: false });
    const validationMap = new Map(validations.map(v => [v.sheetName, v]));
    const mappingMap = new Map(mappings.map(m => [m.sheetName, m]));

    const sheetsToImport = analysis.importOrder
      .map(sheetName => {
        const sheetAnalysis = analysis.sheets.find(s => s.sheetName === sheetName);
        const mapping = mappingMap.get(sheetName);
        const validation = validationMap.get(sheetName);
        const ws = workbook.Sheets[sheetName];

        if (!sheetAnalysis || !mapping || !ws || !validation) return null;

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

        // Apply user column overrides
        const userOverrides = options?.userColumnOverrides?.[sheetName];
        const columnMappings = userOverrides
          ? this.matcher.buildColumnMappings(sheetAnalysis.columns, userOverrides)
          : mapping.columnMappings;

        return {
          analysis: sheetAnalysis,
          rows,
          mappings: columnMappings,
          validation,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    return this.importer.importWorkbook(sheetsToImport, BigInt(companyId), options);
  }

  /* ─── Full Pipeline (convenience method) ───────────────────────────── */

  async fullImport(
    buffer: Buffer,
    fileName: string,
    companyId: number,
    options?: { dryRun?: boolean; skipErrors?: boolean; userColumnOverrides?: Record<string, Record<string, string>>; userId?: bigint | null },
  ): Promise<{
    analysis: WorkbookAnalysis;
    mappings: ErpModuleMapping[];
    validations: SheetValidationResult[];
    importResult: ImportExecutionResult;
    importPlan: ImportPlan;
  }> {
    this.logger.log(`Starting full pipeline: "${fileName}" for company ${companyId}`);

    // Phase 1: Analyze
    const analysis = this.analyzeWorkbook(buffer, fileName);

    // Phase 2: Map to modules
    const { mappings, warnings } = this.mapToModules(analysis);
    analysis.warnings.push(...warnings);

    // Phase 3: Validate
    const validations = this.validateWorkbook(buffer, analysis);

    // Phase 4: Build plan
    const importPlan = this.buildImportPlan(analysis, mappings, validations);

    // Phase 5: Execute
    const importResult = await this.executeImport(buffer, analysis, mappings, validations, companyId, options);

    this.logger.log(`Full pipeline complete: ${importResult.status} (${importResult.insertedRows} inserted)`);

    return { analysis, mappings, validations, importResult, importPlan };
  }

  /* ─── Query Helpers ────────────────────────────────────────────────── */

  getAvailableModules(): Array<{ key: string; description: string; targetTable: string }> {
    return this.mapper.getAllModules();
  }

  getDependencyGraph(): Record<string, string[]> {
    return this.mapper.getDependencyGraph();
  }
}
