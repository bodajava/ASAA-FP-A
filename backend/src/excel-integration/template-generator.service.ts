/**
 * Template Generator Service
 *
 * Generates XLSX templates from the client workbook schema.
 * Produces clean empty templates (header-only) for both full workbook
 * and per-module downloads.
 */

import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import {
  CLIENT_WORKBOOK_SHEETS,
  getSheetByModule,
  type SheetDef,
  type ColumnDef,
} from './client-workbook-schema';

@Injectable()
export class TemplateGeneratorService {

  /* ─── Full Client Workbook Template ────────────────────────────────── */

  generateFullWorkbook(): Buffer {
    const wb = XLSX.utils.book_new();

    for (const sheet of CLIENT_WORKBOOK_SHEETS) {
      const ws = this.generateSheetWorksheet(sheet);
      XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /* ─── Per-Module Template ──────────────────────────────────────────── */

  generateModuleTemplate(moduleKey: string): Buffer {
    const sheet = getSheetByModule(moduleKey);
    if (!sheet) {
      throw new Error(`Unknown module: ${moduleKey}`);
    }

    const wb = XLSX.utils.book_new();
    const ws = this.generateSheetWorksheet(sheet);
    XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /* ─── Sheet Worksheet Generation ───────────────────────────────────── */

  private generateSheetWorksheet(sheet: SheetDef): XLSX.WorkSheet {
    const headers = sheet.columns.map(c => c.display);

    // Create worksheet with just the header row
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    // Set column widths based on header lengths
    ws['!cols'] = sheet.columns.map(c => ({
      wch: Math.max(c.display.length + 4, 18),
    }));

    return ws;
  }

  /* ─── Utility: Get module list for dropdowns ───────────────────────── */

  getModuleList(): Array<{ key: string; sheetName: string; description: string; columnCount: number }> {
    return CLIENT_WORKBOOK_SHEETS.map(s => ({
      key: s.module,
      sheetName: s.sheetName,
      description: s.description,
      columnCount: s.columns.length,
    }));
  }

  /* ─── Utility: Get CSV template (backward compat) ──────────────────── */

  generateModuleCSV(moduleKey: string): string {
    const sheet = getSheetByModule(moduleKey);
    if (!sheet) {
      throw new Error(`Unknown module: ${moduleKey}`);
    }

    const headers = sheet.columns.map(c => c.display);
    return headers.join(',');
  }
}
