/**
 * Validation Engine Service
 *
 * Validates Excel data row-by-row against auto-generated rules.
 * Produces per-sheet validation results with error/warning breakdowns.
 * No data is inserted until validation succeeds.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  SheetAnalysis, ValidationRule, SheetValidationResult,
  ValidationError, ValidationWarning, ValidationSummary, ColumnAnalysis,
} from './types/excel-integration.types';

@Injectable()
export class ValidationEngineService {
  private readonly logger = new Logger(ValidationEngineService.name);

  /* ─── Validate a sheet ─────────────────────────────────────────────── */

  validateSheet(
    sheetName: string,
    rows: Record<string, unknown>[],
    sheetAnalysis: SheetAnalysis,
  ): SheetValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const duplicateRowNumbers: number[] = [];
    const errorRowNumbers: number[] = [];
    const byColumn: Record<string, { errors: number; warnings: number }> = {};
    const byRule: Record<string, number> = {};

    // Build column index for fast lookup
    const columnNames = rows.length > 0 ? Object.keys(rows[0]) : sheetAnalysis.columns.map((c: ColumnAnalysis) => c.originalName);

    // Initialize counters
    for (const col of columnNames) {
      byColumn[col] = { errors: 0, warnings: 0 };
    }

    // Track unique keys for duplicate detection
    const uniqueKeys = new Map<string, number>();

    // Validate each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1; // 1-indexed for Excel reference
      const rowKey = this.buildRowKey(row, sheetAnalysis.duplicateRules);

      // Duplicate detection
      if (rowKey) {
        if (uniqueKeys.has(rowKey)) {
          duplicateRowNumbers.push(rowNum);
          warnings.push({
            row: rowNum,
            column: sheetAnalysis.duplicateRules[0]?.columns?.[0] || '',
            rule: 'duplicate',
            message: `Duplicate of row ${uniqueKeys.get(rowKey)}`,
            value: rowKey,
            severity: 'warning',
          });
          this.incrementCounter(byColumn, sheetAnalysis.duplicateRules[0]?.columns?.[0] || '', 'warnings');
          this.incrementByRule(byRule, 'duplicate');
          continue; // Skip further validation for duplicates
        }
        uniqueKeys.set(rowKey, rowNum);
      }

      let hasRowError = false;

      // Apply each validation rule
      for (const rule of sheetAnalysis.validationRules) {
        const value = row[rule.column];

        const result = this.validateRule(rule, value, rowNum);
        if (result) {
          if (result.severity === 'error') {
            errors.push(result as ValidationError);
            errorRowNumbers.push(rowNum);
            this.incrementCounter(byColumn, rule.column, 'errors');
            this.incrementByRule(byRule, rule.type);
            hasRowError = true;
          } else {
            warnings.push(result as ValidationWarning);
            this.incrementCounter(byColumn, rule.column, 'warnings');
            this.incrementByRule(byRule, rule.type);
          }
        }
      }

      if (hasRowError && !errorRowNumbers.includes(rowNum)) {
        errorRowNumbers.push(rowNum);
      }
    }

    const validRows = rows.length - new Set(errorRowNumbers).size;
    const invalidRows = new Set(errorRowNumbers).size - duplicateRowNumbers.length;

    const summary: ValidationSummary = {
      totalRows: rows.length,
      validRows: Math.max(0, validRows - duplicateRowNumbers.length),
      invalidRows: Math.max(0, invalidRows),
      duplicateRows: duplicateRowNumbers.length,
      missingRequired: errors.filter(e => e.rule === 'required').length,
      typeErrors: errors.filter(e => e.rule === 'type').length,
      fkErrors: errors.filter(e => e.rule === 'fk').length,
      uniqueViolations: warnings.filter(w => w.rule === 'duplicate').length,
      byColumn,
      byRule,
    };

    return {
      sheetName,
      totalRows: rows.length,
      validRows: summary.validRows,
      invalidRows: summary.invalidRows,
      duplicateRows: summary.duplicateRows,
      newRows: summary.validRows - summary.duplicateRows,
      errors,
      warnings,
      duplicateRowNumbers,
      errorRowNumbers: [...new Set(errorRowNumbers)],
      summary,
    };
  }

  /* ─── Validate a single rule ───────────────────────────────────────── */

  private validateRule(
    rule: ValidationRule,
    value: unknown,
    rowNum: number,
  ): ValidationError | ValidationWarning | null {
    // Skip validation for null/undefined unless required
    if (value === null || value === undefined || value === '') {
      if (rule.type === 'required') {
        return {
          row: rowNum,
          column: rule.column,
          rule: rule.type,
          message: `${rule.column} is required but is empty`,
          value,
          severity: 'error',
        };
      }
      return null; // Other rules don't apply to empty values
    }

    switch (rule.type) {
      case 'required':
        return this.validateRequired(rule, value, rowNum);
      case 'type':
        return this.validateType(rule, value, rowNum);
      case 'range':
        return this.validateRange(rule, value, rowNum);
      case 'enum':
        return this.validateEnum(rule, value, rowNum);
      case 'format':
        return this.validateFormat(rule, value, rowNum);
      default:
        return null;
    }
  }

  private validateRequired(rule: ValidationRule, value: unknown, rowNum: number): ValidationError | null {
    if (value === null || value === undefined || value === '' || value === 0) {
      return {
        row: rowNum,
        column: rule.column,
        rule: rule.type,
        message: `${rule.column} is required`,
        value,
        severity: 'error',
      };
    }
    return null;
  }

  private validateType(rule: ValidationRule, value: unknown, rowNum: number): ValidationError | null {
    const str = String(value).trim();
    switch (rule.expectedType) {
      case 'number':
        if (isNaN(Number(str.replace(/[, ]/g, '')))) {
          return { row: rowNum, column: rule.column, rule: rule.type, message: `Expected number, got "${str}"`, value, severity: 'error' };
        }
        break;
      case 'date':
        if (!this.isValidDate(str)) {
          return { row: rowNum, column: rule.column, rule: rule.type, message: `Expected date, got "${str}"`, value, severity: 'error' };
        }
        break;
      case 'boolean':
        if (!/^(true|false|yes|no|0|1)$/i.test(str)) {
          return { row: rowNum, column: rule.column, rule: rule.type, message: `Expected boolean, got "${str}"`, value, severity: 'error' };
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
          return { row: rowNum, column: rule.column, rule: rule.type, message: `Expected email, got "${str}"`, value, severity: 'error' };
        }
        break;
    }
    return null;
  }

  private validateRange(rule: ValidationRule, value: unknown, rowNum: number): ValidationError | null {
    const num = Number(String(value).replace(/[, ]/g, ''));
    if (isNaN(num)) return null;
    if (rule.min !== undefined && num < rule.min) {
      return { row: rowNum, column: rule.column, rule: rule.type, message: `${value} is below minimum ${rule.min}`, value, severity: 'error' };
    }
    if (rule.max !== undefined && num > rule.max) {
      return { row: rowNum, column: rule.column, rule: rule.type, message: `${value} is above maximum ${rule.max}`, value, severity: 'error' };
    }
    return null;
  }

  private validateEnum(rule: ValidationRule, value: unknown, rowNum: number): ValidationError | ValidationWarning | null {
    if (!rule.allowedValues) return null;
    const str = String(value).trim().toLowerCase();
    if (!rule.allowedValues.some((v: string) => v.toLowerCase() === str)) {
      return {
        row: rowNum,
        column: rule.column,
        rule: rule.type,
        message: `"${value}" is not one of: ${rule.allowedValues.join(', ')}`,
        value,
        severity: rule.severity,
      };
    }
    return null;
  }

  private validateFormat(rule: ValidationRule, value: unknown, rowNum: number): ValidationError | null {
    if (!rule.pattern) return null;
    const str = String(value).trim();
    const regex = new RegExp(rule.pattern);
    if (!regex.test(str)) {
      return { row: rowNum, column: rule.column, rule: rule.type, message: `"${str}" does not match expected format`, value, severity: 'error' };
    }
    return null;
  }

  /* ─── Helpers ──────────────────────────────────────────────────────── */

  private buildRowKey(
    row: Record<string, unknown>,
    duplicateRules: { columns: string[] }[],
  ): string | null {
    if (duplicateRules.length === 0) return null;
    const rule = duplicateRules[0];
    return rule.columns.map(c => String(row[c] ?? '')).join('||');
  }

  private isValidDate(str: string): boolean {
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) return true;
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)) return true;
    const d = new Date(str);
    return !isNaN(d.getTime()) && d.getFullYear() > 1990 && d.getFullYear() < 2100;
  }

  private incrementCounter(
    byColumn: Record<string, { errors: number; warnings: number }>,
    column: string,
    type: 'errors' | 'warnings',
  ): void {
    if (!byColumn[column]) byColumn[column] = { errors: 0, warnings: 0 };
    byColumn[column][type]++;
  }

  private incrementByRule(
    byRule: Record<string, number>,
    rule: string,
  ): void {
    byRule[rule] = (byRule[rule] || 0) + 1;
  }

  /* ─── Aggregate Validation ─────────────────────────────────────────── */

  aggregateResults(results: SheetValidationResult[]): {
    isValid: boolean;
    totalRows: number;
    validRows: number;
    errors: number;
    warnings: number;
    duplicates: number;
    sheets: Record<string, { valid: boolean; errors: number; warnings: number }>;
  } {
    let totalRows = 0;
    let validRows = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalDuplicates = 0;
    const sheets: Record<string, { valid: boolean; errors: number; warnings: number }> = {};

    for (const r of results) {
      totalRows += r.totalRows;
      validRows += r.validRows;
      totalErrors += r.errors.length;
      totalWarnings += r.warnings.length;
      totalDuplicates += r.duplicateRows;
      sheets[r.sheetName] = {
        valid: r.errors.length === 0,
        errors: r.errors.length,
        warnings: r.warnings.length,
      };
    }

    return {
      isValid: totalErrors === 0,
      totalRows,
      validRows,
      errors: totalErrors,
      warnings: totalWarnings,
      duplicates: totalDuplicates,
      sheets,
    };
  }
}
