/**
 * File Type Detection Utility
 *
 * Detects actual file type from magic bytes (content signature) rather than relying
 * on file extension. This prevents misrouting XLSX files renamed to .csv into the
 * CSV parser, which causes "Invalid Opening Quote" and similar parser errors.
 *
 * Magic signatures:
 *   XLSX (ZIP): 50 4B 03 04 (PK..)
 *   XLS (OLE2):  D0 CF 11 E0
 *   CSV:         plain text (fallback)
 */

export type DetectedFileType = 'xlsx' | 'xls' | 'csv';

export interface FileTypeDetectionResult {
  detectedType: DetectedFileType;
  /** True if the detected type differs from the file extension */
  mismatch: boolean;
  /** Human-readable label for the detected type */
  label: string;
}

const MAGIC_XLSX = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const MAGIC_XLS = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]);

function extensionToFileType(ext: string): DetectedFileType | null {
  const lower = ext.toLowerCase();
  if (lower === '.xlsx' || lower === '.xlsm') return 'xlsx';
  if (lower === '.xls') return 'xls';
  if (lower === '.csv') return 'csv';
  return null;
}

function bufferToFileType(buffer: Buffer): DetectedFileType {
  if (buffer.length < 4) return 'csv';

  const header = buffer.subarray(0, 4);

  if (header.equals(MAGIC_XLSX)) return 'xlsx';
  if (header.equals(MAGIC_XLS)) return 'xls';

  // Default: assume CSV (plain text)
  return 'csv';
}

function fileTypeLabel(type: DetectedFileType): string {
  switch (type) {
    case 'xlsx': return 'Excel Workbook (.xlsx)';
    case 'xls': return 'Excel 97-2003 (.xls)';
    case 'csv': return 'CSV';
  }
}

/**
 * Detect the actual file type from buffer content and compare with extension.
 * Returns detection result including mismatch flag.
 */
export function detectFileType(buffer: Buffer, fileName: string): FileTypeDetectionResult {
  const detectedType = bufferToFileType(buffer);

  const dot = fileName.lastIndexOf('.');
  const ext = dot >= 0 ? fileName.substring(dot) : '';
  const extType = extensionToFileType(ext);

  const mismatch = extType !== null && extType !== detectedType;

  return {
    detectedType,
    mismatch,
    label: fileTypeLabel(detectedType),
  };
}

/**
 * Detect file type from buffer only (no extension comparison).
 */
export function detectFileTypeFromBuffer(buffer: Buffer): DetectedFileType {
  return bufferToFileType(buffer);
}

/**
 * Throw a friendly error if extension does not match detected type.
 */
export function assertFileTypeMatch(buffer: Buffer, fileName: string): void {
  const result = detectFileType(buffer, fileName);
  if (result.mismatch) {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'unknown';
    throw new FileTypeMismatchError(ext, result.detectedType);
  }
}

export class FileTypeMismatchError extends Error {
  constructor(
    public readonly extension: string,
    public readonly actualType: DetectedFileType,
  ) {
    super(
      `The uploaded file format does not match its extension. ` +
      `The file has a .${extension} extension but is actually a ${fileTypeLabel(actualType)}. ` +
      `Please rename the file with the correct extension or upload it as the correct file type.`,
    );
    this.name = 'FileTypeMismatchError';
  }
}
