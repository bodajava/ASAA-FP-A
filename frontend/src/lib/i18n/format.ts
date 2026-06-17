/**
 * Locale-aware number/currency/percentage formatters.
 * Use these instead of toLocaleString() to respect the app's language
 * setting regardless of the browser's locale.
 */

export type FormatLocale = 'en' | 'ar';

const LOCALE_MAP: Record<FormatLocale, string> = {
  en: 'en-US',
  ar: 'ar-EG',
};

function getLocale(locale: FormatLocale): string {
  return LOCALE_MAP[locale] ?? 'en-US';
}

/**
 * Format a number with thousand separators and decimal places.
 * en: 1,000,000.50
 * ar: ١٬٠٠٠٬٠٠٠٫٥٠
 */
export function formatNumber(
  value: number | string | null | undefined,
  locale: FormatLocale,
  decimals = 2,
): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return num.toLocaleString(getLocale(locale), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a currency value with symbol.
 * en: EGP 1,000.00
 * ar: ١٬٠٠٠٫٠٠ ج.م
 */
export function formatCurrency(
  value: number | string | null | undefined,
  locale: FormatLocale,
  currency = 'EGP',
): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return num.toLocaleString(getLocale(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a percentage.
 * en: 25.5%  |  ar: ٢٥٫٥٪
 */
export function formatPercent(
  value: number | string | null | undefined,
  locale: FormatLocale,
  decimals = 1,
): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return num.toLocaleString(getLocale(locale), {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Convert a decimal (e.g. 0.255) to a percentage string.
 * en: 25.5%  |  ar: ٢٥٫٥٪
 */
export function formatDecimalAsPercent(
  value: number | string | null | undefined,
  locale: FormatLocale,
  decimals = 1,
): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return (num * 100).toLocaleString(getLocale(locale), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + '%';
}

/**
 * Format a date respecting locale.
 */
export function formatDate(
  value: string | Date | null | undefined,
  locale: FormatLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(getLocale(locale), options ?? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
