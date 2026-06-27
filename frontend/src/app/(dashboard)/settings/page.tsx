'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  User,
  Shield,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Globe,
  Calendar,
  Hash,
  Mail,
  Lock,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/feedback-states';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPatch } from '@/lib/api';
import { MONTH_NAMES } from '@/lib/constants';
import type { Company, UpdateCompanyPayload } from '@/types/api';
import { useI18n } from '@/lib/i18n/i18n-context';

// ---------------------------------------------------------------------------
// Section Card wrapper
// ---------------------------------------------------------------------------
function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-4">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Read-only field
// ---------------------------------------------------------------------------
function ReadOnlyField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {icon}
        {label}
      </label>
      <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
        {value || '—'}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  const { t } = useI18n();
  const { user, activeCompanyId, availableCompanies } = useAuth();

  // Active company full record
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [currency, setCurrency] = useState('');
  const [fiscalYearStart, setFiscalYearStart] = useState<number>(1);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);


  // Fetch company details
  const fetchCompany = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoadingCompany(true);
    setCompanyError(null);
    try {
      const data = await apiGet<Company>(`/companies/${activeCompanyId}`);
      setCompany(data);
      setCompanyName(data.name ?? '');
      setCompanyCode(data.code ?? '');
      setCurrency(data.currency ?? '');
      setFiscalYearStart(data.fiscalYearStart ?? 1);
    } catch (err: unknown) {
      setCompanyError(
        err instanceof Error ? err.message : t('page.settings.loadCompanyFailed'),
      );
    } finally {
      setIsLoadingCompany(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    void Promise.resolve().then(() => void fetchCompany());
  }, [fetchCompany]);


  // Handle form submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      const payload: UpdateCompanyPayload = {
        name: companyName.trim() || undefined,
        code: companyCode.trim() || undefined,
        currency: currency.trim() || undefined,
        fiscalYearStart: fiscalYearStart,
      };
      await apiPatch<Company>(`/companies/${activeCompanyId}`, payload);
      setSaveSuccess(true);
      // Re-fetch to get server-side values
      await fetchCompany();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : t('page.settings.saveCompanyFailed'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Derive the company name for current active company from sidebar list (auth context)
  const activeCompanyName =
    availableCompanies.find((c) => c.id === activeCompanyId)?.name ?? activeCompanyId ?? '—';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('page.settings.title')}
          description={t('page.settings.description')}
        />
        <ErrorState
          title={t('common.noActiveCompany')}
          message={t('common.noActiveCompany')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('page.settings.title')}
        description={t('page.settings.description')}
      />

      {/* ------------------------------------------------------------------ */}
      {/* 1. Company Profile                                                   */}
      {/* ------------------------------------------------------------------ */}
      <SectionCard
        icon={<Building2 className="h-4 w-4" />}
        title={t('page.settings.companyProfile')}
        description={t('page.settings.companyProfileDesc', { name: activeCompanyName, id: activeCompanyId })}
      >
        {isLoadingCompany ? (
          <LoadingState rows={4} message={t('common.loading')} />
        ) : companyError ? (
          <ErrorState message={companyError} onRetry={fetchCompany} />
        ) : (
          <form onSubmit={(e) => void handleSave(e)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="company-name"
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"
                >
                  <Building2 className="h-2.5 w-2.5" /> {t('page.settings.companyName')}
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  maxLength={120}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Code */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="company-code"
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"
                >
                  <Hash className="h-2.5 w-2.5" /> {t('page.settings.companyCode')}
                </label>
                <input
                  id="company-code"
                  type="text"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  required
                  maxLength={20}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Currency */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="company-currency"
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"
                >
                  <Globe className="h-2.5 w-2.5" /> {t('page.settings.defaultCurrency')}
                </label>
                <select
                  id="company-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{t('page.settings.selectCurrency')}</option>
                  <option value="USD">USD – US Dollar</option>
                  <option value="EUR">EUR – Euro</option>
                  <option value="GBP">GBP – British Pound</option>
                  <option value="EGP">EGP – Egyptian Pound</option>
                  <option value="SAR">SAR – Saudi Riyal</option>
                  <option value="AED">AED – UAE Dirham</option>
                  <option value="KWD">KWD – Kuwaiti Dinar</option>
                  <option value="QAR">QAR – Qatari Riyal</option>
                  <option value="BHD">BHD – Bahraini Dinar</option>
                  <option value="OMR">OMR – Omani Rial</option>
                  <option value="JOD">JOD – Jordanian Dinar</option>
                  <option value="TRY">TRY – Turkish Lira</option>
                  <option value="MAD">MAD – Moroccan Dirham</option>
                  <option value="CHF">CHF – Swiss Franc</option>
                  <option value="JPY">JPY – Japanese Yen</option>
                  <option value="CNY">CNY – Chinese Yuan</option>
                  <option value="INR">INR – Indian Rupee</option>
                  <option value="NGN">NGN – Nigerian Naira</option>
                  <option value="ZAR">ZAR – South African Rand</option>
                </select>
              </div>

              {/* Fiscal Year Start */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="company-fiscal"
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"
                >
                  <Calendar className="h-2.5 w-2.5" /> {t('page.settings.fiscalYearStart')}
                </label>
                <select
                  id="company-fiscal"
                  value={fiscalYearStart}
                  onChange={(e) => setFiscalYearStart(Number(e.target.value))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {MONTH_NAMES.slice(1).map((month, idx) => (
                    <option key={month} value={idx + 1}>
                      {idx + 1} – {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Read-only fields (cannot be changed via UI) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <ReadOnlyField
                icon={<Lock className="h-2.5 w-2.5" />}
                label={t('page.settings.companyId')}
                value={company?.id ?? activeCompanyId}
              />
              <ReadOnlyField
                icon={<Shield className="h-2.5 w-2.5" />}
                label={t('page.settings.tenantId')}
                value={company?.tenantId ?? '—'}
              />
            </div>

            {/* Status messages */}
            {saveSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 font-semibold">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {t('page.settings.savedSuccess')}
              </div>
            )}
            {saveError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {saveError}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void fetchCompany()}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingCompany ? 'animate-spin' : ''}`} />
                {t('page.settings.discardReload')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="flex items-center gap-1.5"
              >
                {isSaving ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {isSaving ? t('page.settings.saving') : t('page.settings.saveChanges')}
              </Button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Active Session (read-only)                                        */}
      {/* ------------------------------------------------------------------ */}
      <SectionCard
        icon={<User className="h-4 w-4" />}
        title={t('page.settings.activeSession')}
        description={t('page.settings.activeSessionDesc')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ReadOnlyField
            icon={<User className="h-2.5 w-2.5" />}
            label={t('page.settings.fullName')}
            value={user ? `${user.firstName} ${user.lastName}` : '—'}
          />
          <ReadOnlyField
            icon={<Mail className="h-2.5 w-2.5" />}
            label={t('page.settings.emailAddress')}
            value={user?.email ?? '—'}
          />
          <ReadOnlyField
            icon={<Shield className="h-2.5 w-2.5" />}
            label={t('page.settings.role')}
            value={user?.role ?? '—'}
          />
          <ReadOnlyField
            icon={<Hash className="h-2.5 w-2.5" />}
            label={t('page.settings.userId')}
            value={user?.id ?? '—'}
          />
          <ReadOnlyField
            icon={<Lock className="h-2.5 w-2.5" />}
            label={t('page.settings.tenantId')}
            value={user?.tenantId ?? '—'}
          />
          <ReadOnlyField
            icon={<Building2 className="h-2.5 w-2.5" />}
            label={t('page.settings.activeCompanyId')}
            value={activeCompanyId ?? '—'}
          />
        </div>

        <p className="mt-4 text-[10px] text-slate-400 font-medium">
          {t('page.settings.sessionDisclaimer')}
        </p>
      </SectionCard>
    </div>
  );
}
