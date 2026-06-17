'use client';

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/currency';
import { useI18n } from '@/lib/i18n/i18n-context';

export function useActiveCurrency() {
  const { availableCompanies, activeCompanyId } = useAuth();
  const { locale } = useI18n();

  const activeCompany = useMemo(
    () => availableCompanies.find((c) => c.id === activeCompanyId),
    [availableCompanies, activeCompanyId],
  );

  const currency = activeCompany?.currency ?? 'EGP';

  const fmt = (amount: number | string | bigint | null | undefined) =>
    formatCurrency(amount, currency, locale);

  return { currency, format: fmt };
}
