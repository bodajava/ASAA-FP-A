/**
 * Excel Integration — Core Type Definitions
 *
 * These types define the contract between the Excel Analyzer, Import Engine,
 * and ERP Mapper. Every Excel workbook is analyzed into this structure
 * before any data is imported.
 */

/* ─── Sheet Analysis ────────────────────────────────────────────────────── */

export interface SheetAnalysis {
  /** Original sheet name from the Excel workbook — never modified */
  sheetName: string;
  /** Auto-detected business module (e.g., 'products', 'budget_lines') */
  detectedModule: string;
  /** User-confirmed or auto-mapped ERP module key */
  erpModule: string;
  /** All columns detected in the sheet — preserves original names */
  columns: ColumnAnalysis[];
  /** Total row count (excluding header) */
  rowCount: number;
  /** Columns identified as required for import */
  requiredColumns: string[];
  /** Columns that are optional */
  optionalColumns: string[];
  /** Foreign key relationships detected */
  foreignKeys: ForeignKeyRelation[];
  /** Validation rules auto-generated for this sheet */
  validationRules: ValidationRule[];
  /** Duplicate detection configuration */
  duplicateRules: DuplicateRule[];
  /** Import dependency — sheets that must be imported BEFORE this one */
  dependsOn: string[];
  /** Sheets that depend on this sheet (reverse dependency) */
  dependedOnBy: string[];
  /** Import priority order (lower = earlier) */
  importOrder: number;
  /** Whether this sheet is ready for import */
  isReady: boolean;
  /** Warnings detected during analysis */
  warnings: AnalysisWarning[];
}

/* ─── Column Analysis ───────────────────────────────────────────────────── */

export interface ColumnAnalysis {
  /** Original column name from Excel — NEVER renamed */
  originalName: string;
  /** Normalized key (lowercase, no spaces/underscores) for internal matching */
  normalizedKey: string;
  /** Auto-detected data type */
  detectedType: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage' | 'mixed' | 'empty';
  /** Whether this column contains any data */
  hasData: boolean;
  /** Percentage of non-null values (0-100) */
  fillRate: number;
  /** Sample values for UI display */
  sampleValues: string[];
  /** Whether this column is a potential primary key */
  isPotentialKey: boolean;
  /** Whether this column is a potential foreign key */
  isPotentialFK: boolean;
  /** If FK, which sheet/column it references */
  references?: FKReference;
  /** Auto-mapped ERP field name (if matched) */
  mappedErpField?: string;
  /** Mapping confidence (0-1, 1 = exact match) */
  mappingConfidence: number;
  /** Whether the user has manually overridden the mapping */
  userOverride: boolean;
}

/* ─── Foreign Key Relations ─────────────────────────────────────────────── */

export interface ForeignKeyRelation {
  /** Column in this sheet that is the FK */
  localColumn: string;
  /** Sheet being referenced */
  referenceSheet: string;
  /** Column in the referenced sheet (usually the PK or unique key) */
  referenceColumn: string;
  /** Relationship type */
  type: 'required' | 'optional';
  /** How the FK was detected */
  detectionMethod: 'name_match' | 'data_match' | 'user_defined';
}

export interface FKReference {
  sheet: string;
  column: string;
}

/* ─── Validation ────────────────────────────────────────────────────────── */

export interface ValidationRule {
  /** Column this rule applies to */
  column: string;
  /** Rule type */
  type: 'required' | 'unique' | 'type' | 'range' | 'enum' | 'fk' | 'format' | 'custom';
  /** Human-readable description */
  description: string;
  /** For 'type' rules: expected type */
  expectedType?: string;
  /** For 'enum' rules: allowed values */
  allowedValues?: string[];
  /** For 'fk' rules: reference info */
  fkReference?: FKReference;
  /** For 'range' rules */
  min?: number;
  max?: number;
  /** For 'format' rules: regex pattern */
  pattern?: string;
  /** Severity */
  severity: 'error' | 'warning';
}

export interface DuplicateRule {
  /** Columns that form the unique key */
  columns: string[];
  /** Rule type */
  type: 'exact' | 'fuzzy' | 'composite';
  /** Description */
  description: string;
}

/* ─── Validation Results ────────────────────────────────────────────────── */

export interface SheetValidationResult {
  sheetName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  newRows: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  /** Row numbers that are duplicates (1-indexed) */
  duplicateRowNumbers: number[];
  /** Row numbers that have errors */
  errorRowNumbers: number[];
  /** Pre-import summary */
  summary: ValidationSummary;
}

export interface ValidationError {
  row: number;
  column: string;
  rule: string;
  message: string;
  value: unknown;
  severity: 'error';
}

export interface ValidationWarning {
  row: number;
  column: string;
  rule: string;
  message: string;
  value: unknown;
  severity: 'warning';
}

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  missingRequired: number;
  typeErrors: number;
  fkErrors: number;
  uniqueViolations: number;
  byColumn: Record<string, { errors: number; warnings: number }>;
  byRule: Record<string, number>;
}

/* ─── Import Execution ──────────────────────────────────────────────────── */

export interface ImportPlan {
  /** Sheets to import, in dependency order */
  sheets: ImportSheetPlan[];
  /** Total rows across all sheets */
  totalRows: number;
  /** Estimated duration in ms */
  estimatedDurationMs: number;
}

export interface ImportSheetPlan {
  sheetName: string;
  erpModule: string;
  /** Column mapping: Excel column → ERP field */
  columnMap: Record<string, string>;
  /** Rows to import */
  rowCount: number;
  /** Import priority */
  order: number;
  /** Whether to skip errors for this sheet */
  skipErrors: boolean;
}

export interface ImportExecutionResult {
  /** Per-sheet results */
  sheets: SheetImportResult[];
  /** Overall status */
  status: 'completed' | 'partial' | 'failed';
  /** Total rows processed */
  totalRows: number;
  /** Total rows inserted */
  insertedRows: number;
  /** Total rows failed */
  failedRows: number;
  /** Total rows skipped */
  skippedRows: number;
  /** Duration in ms */
  durationMs: number;
  /** Average rows/sec */
  rowsPerSecond: number;
  /** Generated reports */
  reports: ImportReport[];
}

export interface SheetImportResult {
  sheetName: string;
  erpModule: string;
  status: 'completed' | 'partial' | 'failed' | 'skipped';
  totalRows: number;
  insertedRows: number;
  failedRows: number;
  skippedRows: number;
  durationMs: number;
  rowsPerSecond: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  column: string;
  message: string;
  value: unknown;
}

/* ─── Reports ───────────────────────────────────────────────────────────── */

export interface ImportReport {
  type: 'validation' | 'error' | 'duplicate' | 'summary';
  sheetName: string;
  title: string;
  data: unknown[];
}

/* ─── Analysis Warning ──────────────────────────────────────────────────── */

export interface AnalysisWarning {
  type: 'new_column' | 'empty_column' | 'type_mismatch' | 'low_fill_rate' | 'orphan_data' | 'naming_convention';
  column?: string;
  message: string;
  suggestion: string;
}

/* ─── Workbook Analysis (top-level) ─────────────────────────────────────── */

export interface WorkbookAnalysis {
  /** Original file name */
  fileName: string;
  /** Analysis timestamp */
  analyzedAt: string;
  /** All sheets in the workbook */
  sheets: SheetAnalysis[];
  /** Global import order */
  importOrder: string[];
  /** Cross-sheet relationship graph */
  relationships: ForeignKeyRelation[];
  /** Warnings about the overall workbook */
  warnings: AnalysisWarning[];
  /** Whether the workbook is ready for import */
  isReady: boolean;
  /** Total rows across all sheets */
  totalRows: number;
}

/* ─── Sheet Role Classification ──────────────────────────────────────────── */

export type SheetRole = 'data' | 'reference' | 'instruction' | 'ignored';

export interface SheetPreviewEntry {
  sheetName: string;
  sheetRole: SheetRole;
  mappedModule: string;
  importable: boolean;
  rowCount: number;
  validRows: number;
  errors: SheetPreviewError[];
  warnings: string[];
  status: 'ready' | 'needs_mapping' | 'unsupported' | 'reference' | 'instruction' | 'ignored';
}

export interface SheetPreviewError {
  row: number;
  column: string;
  reason: 'missing_required' | 'invalid_enum' | 'missing_dependency' | 'unsupported_sheet' | 'database_insert_error' | 'duplicate' | 'validation_error';
  message: string;
  value: unknown;
}

export interface WorkbookPreviewResultV2 {
  workbookType: string;
  fileName: string;
  sheets: SheetPreviewEntry[];
  summary: {
    totalWorkbookRows: number;
    importableRows: number;
    referenceRows: number;
    instructionRows: number;
    validImportableRows: number;
    invalidImportableRows: number;
  };
  warnings: string[];
}

/* ─── ERP Module Mapping ────────────────────────────────────────────────── */

export interface ErpModuleMapping {
  /** Sheet name from the workbook */
  sheetName: string;
  /** ERP module this sheet maps to */
  module: string;
  /** Description of what this module represents */
  description: string;
  /** Confidence that this mapping is correct (0-1) */
  confidence: number;
  /** Column mappings: Excel column → ERP field */
  columnMappings: ColumnMapping[];
  /** Whether this module requires a parent module */
  requiresParent?: string;
  /** Table name in the database */
  targetTable: string;
}

export interface ColumnMapping {
  /** Original Excel column name */
  excelColumn: string;
  /** Target ERP field name */
  erpField: string;
  /** Mapping type */
  type: 'direct' | 'transform' | 'lookup' | 'default' | 'skip';
  /** For 'transform' type: transformation rule */
  transform?: string;
  /** For 'lookup' type: lookup configuration */
  lookup?: {
    sourceSheet: string;
    sourceColumn: string;
    targetColumn: string;
  };
  /** For 'default' type: default value */
  defaultValue?: unknown;
  /** Confidence of this mapping */
  confidence: number;
}
