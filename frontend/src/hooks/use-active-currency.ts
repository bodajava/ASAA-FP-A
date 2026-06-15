'use client';

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/currency';

export function useActiveCurrency() {
  const { availableCompanies, activeCompanyId } = useAuth();

  const activeCompany = useMemo(
    () => availableCompanies.find((c) => c.id === activeCompanyId),
    [availableCompanies, activeCompanyId],
  );

  const currency = activeCompany?.currency ?? 'EGP';

  const fmt = (amount: number | string | bigint | null | undefined) =>
    formatCurrency(amount, currency);

  return { currency, format: fmt };
}
