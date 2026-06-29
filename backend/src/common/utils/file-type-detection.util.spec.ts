/**
 * File Type Detection Tests
 *
 * Tests for magic bytes-based file type detection.
 * Covers: real CSV, real XLSX, XLSX renamed to .csv, CSV renamed to .xlsx,
 * corrupted CSV, corrupted XLSX, edge cases.
 */

import {
  detectFileType,
  detectFileTypeFromBuffer,
  FileTypeMismatchError,
  assertFileTypeMatch,
} from './file-type-detection.util';

// Real XLSX magic bytes: PK.. (ZIP format)
const XLSX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
// Real XLS magic bytes: D0 CF 11 E0
const XLS_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

describe('file-type-detection', () => {
  describe('detectFileType', () => {
    it('should detect XLSX from magic bytes', () => {
      const result = detectFileType(XLSX_MAGIC, 'data.xlsx');
      expect(result.detectedType).toBe('xlsx');
      expect(result.mismatch).toBe(false);
      expect(result.label).toBe('Excel Workbook (.xlsx)');
    });

    it('should detect XLS from magic bytes', () => {
      const result = detectFileType(XLS_MAGIC, 'data.xls');
      expect(result.detectedType).toBe('xls');
      expect(result.mismatch).toBe(false);
      expect(result.label).toBe('Excel 97-2003 (.xls)');
    });

    it('should detect CSV from plain text', () => {
      const csvContent = Buffer.from('Name,Amount,Date\nWidget,100,2024-01-01\n');
      const result = detectFileType(csvContent, 'data.csv');
      expect(result.detectedType).toBe('csv');
      expect(result.mismatch).toBe(false);
      expect(result.label).toBe('CSV');
    });

    it('should detect XLSX with .csv extension as mismatch', () => {
      const result = detectFileType(XLSX_MAGIC, 'data.csv');
      expect(result.detectedType).toBe('xlsx');
      expect(result.mismatch).toBe(true);
    });

    it('should detect CSV with .xlsx extension as mismatch', () => {
      const csvContent = Buffer.from('Name,Amount\nWidget,100\n');
      const result = detectFileType(csvContent, 'data.xlsx');
      expect(result.detectedType).toBe('csv');
      expect(result.mismatch).toBe(true);
    });

    it('should detect XLS with .csv extension as mismatch', () => {
      const result = detectFileType(XLS_MAGIC, 'report.csv');
      expect(result.detectedType).toBe('xls');
      expect(result.mismatch).toBe(true);
    });

    it('should handle empty buffer as CSV', () => {
      const result = detectFileType(Buffer.alloc(0), 'file.csv');
      expect(result.detectedType).toBe('csv');
      expect(result.mismatch).toBe(false);
    });

    it('should handle buffer smaller than 4 bytes as CSV', () => {
      const result = detectFileType(Buffer.from([0x50, 0x4b]), 'file.csv');
      expect(result.detectedType).toBe('csv');
      expect(result.mismatch).toBe(false);
    });

    it('should detect XLSX with .xlsm extension', () => {
      const result = detectFileType(XLSX_MAGIC, 'data.xlsm');
      expect(result.detectedType).toBe('xlsx');
      expect(result.mismatch).toBe(false);
    });

    it('should detect XLSX with .xls extension as mismatch', () => {
      const result = detectFileType(XLSX_MAGIC, 'data.xls');
      expect(result.detectedType).toBe('xlsx');
      expect(result.mismatch).toBe(true);
    });
  });

  describe('detectFileTypeFromBuffer', () => {
    it('should return xlsx for ZIP header', () => {
      expect(detectFileTypeFromBuffer(XLSX_MAGIC)).toBe('xlsx');
    });

    it('should return xls for OLE2 header', () => {
      expect(detectFileTypeFromBuffer(XLS_MAGIC)).toBe('xls');
    });

    it('should return csv for plain text', () => {
      const csv = Buffer.from('col1,col2\nval1,val2\n');
      expect(detectFileTypeFromBuffer(csv)).toBe('csv');
    });
  });

  describe('FileTypeMismatchError', () => {
    it('should have correct name and message', () => {
      const err = new FileTypeMismatchError('csv', 'xlsx');
      expect(err.name).toBe('FileTypeMismatchError');
      expect(err.extension).toBe('csv');
      expect(err.actualType).toBe('xlsx');
      expect(err.message).toContain('.csv');
      expect(err.message).toContain('Excel Workbook (.xlsx)');
      expect(err.message).toContain('does not match');
    });

    it('should be an instance of Error', () => {
      const err = new FileTypeMismatchError('csv', 'xlsx');
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('assertFileTypeMatch', () => {
    it('should not throw for matching types', () => {
      expect(() => assertFileTypeMatch(XLSX_MAGIC, 'data.xlsx')).not.toThrow();
      expect(() => assertFileTypeMatch(XLS_MAGIC, 'data.xls')).not.toThrow();
      const csv = Buffer.from('Name,Amount\n');
      expect(() => assertFileTypeMatch(csv, 'data.csv')).not.toThrow();
    });

    it('should throw FileTypeMismatchError for mismatched types', () => {
      expect(() => assertFileTypeMatch(XLSX_MAGIC, 'data.csv')).toThrow(FileTypeMismatchError);
      expect(() => assertFileTypeMatch(XLS_MAGIC, 'data.csv')).toThrow(FileTypeMismatchError);
      const csv = Buffer.from('Name,Amount\n');
      expect(() => assertFileTypeMatch(csv, 'data.xlsx')).toThrow(FileTypeMismatchError);
    });
  });
});
