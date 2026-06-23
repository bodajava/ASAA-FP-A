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
  Zap,
  Sparkles,
  BarChart3,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/feedback-states';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPatch } from '@/lib/api';
import { MONTH_NAMES } from '@/lib/constants';
import type { Company, UpdateCompanyPayload, Plan } from '@/types/api';
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
  const { user, activeCompanyId, availableCompanies, tenant, refreshUser } = useAuth();

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

  // Subscription plans
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);

  // Subscription upgrade state
  const [isYearly, setIsYearly] = useState(false);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    setPlansError(null);
    try {
      const data = await apiGet<Plan[]>('/plans');
      setPlans(data);
    } catch (err: unknown) {
      setPlansError(
        err instanceof Error ? err.message : t('page.settings.loadPlansFailed'),
      );
    } finally {
      setIsLoadingPlans(false);
    }
  }, []);

  const handleUpgradePlan = async (planId: string, planName: string) => {
    setUpgradingPlanId(planId);
    setUpgradeError(null);
    setUpgradeSuccess(null);
    try {
      await apiPatch<{ message?: string }>(`/tenants/current/plan`, { planId });
      setUpgradeSuccess(t('page.settings.upgradeSuccess', { plan: planName }));
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err: unknown) {
      setUpgradeError(
        err instanceof Error ? err.message : t('page.settings.upgradeFailed', { plan: planName }),
      );
    } finally {
      setUpgradingPlanId(null);
    }
  };


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

  useEffect(() => {
    void Promise.resolve().then(() => void fetchPlans());
  }, [fetchPlans]);

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
          <ReadOnlyField
            icon={<Shield className="h-2.5 w-2.5" />}
            label={t('page.settings.subscriptionPlan')}
            value={tenant?.plan?.name ?? 'Starter'}
          />
        </div>

        <p className="mt-4 text-[10px] text-slate-400 font-medium">
          {t('page.settings.sessionDisclaimer')}
        </p>
      </SectionCard>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Subscription Plans                                              */}
      {/* ------------------------------------------------------------------ */}
      <SectionCard
        icon={<Shield className="h-4 w-4" />}
        title={t('page.settings.subscriptionPlans')}
        description={t('page.settings.subscriptionPlansDesc')}
      >
        {upgradeSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 font-semibold animate-in fade-in duration-200">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {upgradeSuccess}
          </div>
        )}
        {upgradeError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 font-semibold animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {upgradeError}
          </div>
        )}

        {isLoadingPlans ? (
          <LoadingState rows={3} message={t('common.loading')} />
        ) : plansError ? (
          <ErrorState message={plansError} onRetry={fetchPlans} />
        ) : plans.length === 0 ? (
          <ErrorState message={t('common.noData')} />
        ) : (
          <>
            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <span className={`text-xs font-bold transition-colors ${!isYearly ? 'text-slate-800' : 'text-slate-400'}`}>{t('page.settings.monthly')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={isYearly}
                onClick={() => setIsYearly(!isYearly)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isYearly ? 'bg-emerald-500' : 'bg-slate-200'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition-transform ${isYearly ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <span className={`text-xs font-bold transition-colors ${isYearly ? 'text-slate-800' : 'text-slate-400'}`}>
                {t('page.settings.yearly')}
                <span className="ml-1 text-[10px] text-emerald-600 font-bold">{t('page.settings.savePercent')}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {plans.map((p) => {
                const code = p.code?.toLowerCase() ?? '';
                const isCurrent = tenant?.plan?.name?.toLowerCase() === p.name.toLowerCase() ||
                  (!tenant?.plan && code === 'starter');

                let headerBg = 'bg-slate-50 border-slate-200';
                let planIcon = <Building2 className="h-5 w-5 text-slate-500" />;
                let badgeText = '';
                let badgeClasses = 'bg-slate-100 text-slate-800';
                let accentColor = 'emerald';
                let borderAccent = 'border-emerald-500';
                let btnStyle = '';

                if (code === 'business') {
                  headerBg = 'bg-emerald-50/50 border-emerald-100';
                  planIcon = <Zap className="h-5 w-5 text-emerald-600" />;
                  badgeText = t('page.settings.mostPopular');
                  badgeClasses = 'bg-emerald-100 text-emerald-800';
                  accentColor = 'emerald';
                  borderAccent = 'border-emerald-500';
                  btnStyle = 'bg-emerald-600 hover:bg-emerald-700 text-white border-none';
                } else if (code === 'enterprise') {
                  headerBg = 'bg-indigo-50/50 border-indigo-100';
                  planIcon = <Sparkles className="h-5 w-5 text-indigo-600" />;
                  badgeText = t('page.settings.completeSuite');
                  badgeClasses = 'bg-indigo-100 text-indigo-800';
                  accentColor = 'indigo';
                  borderAccent = 'border-indigo-500';
                  btnStyle = 'bg-indigo-600 hover:bg-indigo-700 text-white border-none';
                }

                const price = isYearly ? p.yearlyPrice : p.monthlyPrice;
                const periodLabel = isYearly ? t('page.settings.perYear') : t('page.settings.perMonth');

                return (
                  <div
                    key={p.id}
                    className={`flex flex-col rounded-xl border transition-all duration-200 ${isCurrent
                      ? `${borderAccent} shadow-md ring-2 ring-${accentColor}-500/10`
                      : 'border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                  >
                    {/* Plan Header */}
                    <div className={`p-5 rounded-t-xl border-b border-slate-100 ${headerBg} relative`}>
                      {badgeText && (
                        <span className={`absolute top-4 right-4 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClasses}`}>
                          {badgeText}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        {planIcon}
                        <h3 className="text-sm font-bold text-slate-800">{p.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 min-h-[32px]">{p.description}</p>

                      {/* Pricing */}
                      <div className="mt-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold text-slate-800">${price}</span>
                          <span className="text-xs text-slate-400 font-semibold">{periodLabel}</span>
                        </div>
                        {isYearly && p.monthlyPrice > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {t('page.settings.billedAnnually', { price: (price / 12).toFixed(2) })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Plan Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between gap-5">
                      <div className="space-y-4">
                        {/* Limits */}
                        <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 pb-4 border-b border-slate-100 text-[11px] font-semibold">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{t('page.settings.companies')}</span>
                            <span className="ml-auto text-slate-800">{p.maxCompanies >= 999 ? t('page.settings.unlimited') : p.maxCompanies}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{t('page.settings.users')}</span>
                            <span className="ml-auto text-slate-800">{p.maxUsers >= 999 ? t('page.settings.unlimited') : p.maxUsers}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{t('page.settings.branches')}</span>
                            <span className="ml-auto text-slate-800">{p.maxBranches >= 999 ? t('page.settings.unlimited') : p.maxBranches}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <BarChart3 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{t('page.settings.dashboardLabel')}</span>
                            <span className="ml-auto text-slate-800 capitalize">{p.dashboardLevel}</span>
                          </div>
                        </div>

                        {/* Features */}
                        {p.features && p.features.length > 0 && (
                          <ul className="space-y-2">
                            {p.features.map((feature, index) => (
                              <li key={index} className="flex items-start gap-2 text-xs font-medium text-slate-600">
                                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Restrictions */}

                      </div>

                      {/* Action Button */}
                      <div className="pt-4 border-t border-slate-100">
                        {isCurrent ? (
                          <div className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-700">
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            {t('page.settings.activePlan')}
                          </div>
                        ) : (
                          <Button
                            variant={code === 'starter' ? 'outline' : 'primary'}
                            className={`w-full text-xs font-bold flex items-center justify-center gap-1.5 py-2.5 ${btnStyle}`}
                            disabled={upgradingPlanId !== null}
                            onClick={() => void handleUpgradePlan(p.id, p.name)}
                          >
                            {upgradingPlanId === p.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {t('page.settings.upgrading')}
                              </>
                            ) : (
                              t('page.settings.selectPlan', { name: p.name })
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
