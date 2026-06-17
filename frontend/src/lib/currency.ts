const currencyConfig: Record<
  string,
  { locale: string; symbol: string; code: string }
> = {
  EGP: { locale: 'ar-EG', symbol: 'E£', code: 'EGP' },
  USD: { locale: 'en-US', symbol: '$', code: 'USD' },
  EUR: { locale: 'de-DE', symbol: '€', code: 'EUR' },
  SAR: { locale: 'ar-SA', symbol: '﷼', code: 'SAR' },
  GBP: { locale: 'en-GB', symbol: '£', code: 'GBP' },
  AED: { locale: 'ar-AE', symbol: 'د.إ', code: 'AED' },
  KWD: { locale: 'ar-KW', symbol: 'د.ك', code: 'KWD' },
  QAR: { locale: 'ar-QA', symbol: 'ر.ق', code: 'QAR' },
  BHD: { locale: 'ar-BH', symbol: 'د.ب', code: 'BHD' },
  OMR: { locale: 'ar-OM', symbol: 'ر.ع', code: 'OMR' },
  JOD: { locale: 'ar-JO', symbol: 'د.ا', code: 'JOD' },
  TRY: { locale: 'tr-TR', symbol: '₺', code: 'TRY' },
  MAD: { locale: 'ar-MA', symbol: 'د.م.', code: 'MAD' },
  CHF: { locale: 'de-CH', symbol: 'CHF', code: 'CHF' },
  JPY: { locale: 'ja-JP', symbol: '¥', code: 'JPY' },
  CNY: { locale: 'zh-CN', symbol: '¥', code: 'CNY' },
  INR: { locale: 'en-IN', symbol: '₹', code: 'INR' },
  NGN: { locale: 'en-NG', symbol: '₦', code: 'NGN' },
  ZAR: { locale: 'en-ZA', symbol: 'R', code: 'ZAR' },
};

export function formatCurrency(
  amount: number | string | bigint | null | undefined,
  currencyCode?: string | null,
  locale?: string,
): string {
  if (amount == null) return '—';
  const num = typeof amount === 'bigint' ? Number(amount) : Number(amount);
  if (isNaN(num)) return '—';

  const code = (currencyCode || 'EGP').toUpperCase();
  const fmtLocale = resolveLocale(locale);

  try {
    return new Intl.NumberFormat(fmtLocale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
  }
}

function resolveLocale(locale?: string): string {
  if (locale === 'ar') return 'ar-EG';
  return 'en-US';
}

export function formatNumber(
  value: number | string | bigint | null | undefined,
  fractionDigits = 0,
  locale?: string,
): string {
  if (value == null) return '—';
  const num = typeof value === 'bigint' ? Number(value) : Number(value);
  if (isNaN(num)) return '—';
  const fmtLocale = resolveLocale(locale);
  return num.toLocaleString(fmtLocale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatPercent(
  value: number | string | null | undefined,
  fractionDigits = 1,
  locale?: string,
): string {
  if (value == null) return '—';
  const num = Number(value);
  if (isNaN(num)) return '—';
  const fmtLocale = resolveLocale(locale);
  return num.toLocaleString(fmtLocale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }) + '%';
}

export function getCurrencySymbol(currencyCode?: string | null): string {
  const code = (currencyCode || 'EGP').toUpperCase();
  return currencyConfig[code]?.symbol ?? code;
}
