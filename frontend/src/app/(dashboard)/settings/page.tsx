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
        err instanceof Error ? err.message : 'Failed to load subscription plans.',
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
      setUpgradeSuccess(`Successfully upgraded to the ${planName} plan!`);
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err: unknown) {
      setUpgradeError(
        err instanceof Error ? err.message : `Failed to upgrade to the ${planName} plan.`
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
        err instanceof Error ? err.message : 'Failed to load company details.',
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
        err instanceof Error ? err.message : 'Failed to save company settings.',
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
          title="Settings"
          description="Manage company configuration and session preferences"
        />
        <ErrorState
          title="No active company selected"
          message="Please select a company from the sidebar before opening Settings."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Company configuration and active session information"
      />

      {/* ------------------------------------------------------------------ */}
      {/* 1. Company Profile                                                   */}
      {/* ------------------------------------------------------------------ */}
      <SectionCard
        icon={<Building2 className="h-4 w-4" />}
        title="Company Profile"
        description={`Active company: ${activeCompanyName} · ID ${activeCompanyId}`}
      >
        {isLoadingCompany ? (
          <LoadingState rows={4} message="Loading company details…" />
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
                  <Building2 className="h-2.5 w-2.5" /> Company Name
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
                  <Hash className="h-2.5 w-2.5" /> Company Code
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
                  <Globe className="h-2.5 w-2.5" /> Default Currency
                </label>
                <select
                  id="company-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">— Select currency —</option>
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
                  <Calendar className="h-2.5 w-2.5" /> Fiscal Year Start Month
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
                label="Company ID"
                value={company?.id ?? activeCompanyId}
              />
              <ReadOnlyField
                icon={<Shield className="h-2.5 w-2.5" />}
                label="Tenant ID"
                value={company?.tenantId ?? '—'}
              />
            </div>

            {/* Status messages */}
            {saveSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 font-semibold">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Company profile updated successfully.
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
                Discard &amp; reload
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
                {isSaving ? 'Saving…' : 'Save Changes'}
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
        title="Active Session"
        description="Current authenticated user and tenant details — read only"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ReadOnlyField
            icon={<User className="h-2.5 w-2.5" />}
            label="Full Name"
            value={user ? `${user.firstName} ${user.lastName}` : '—'}
          />
          <ReadOnlyField
            icon={<Mail className="h-2.5 w-2.5" />}
            label="Email Address"
            value={user?.email ?? '—'}
          />
          <ReadOnlyField
            icon={<Shield className="h-2.5 w-2.5" />}
            label="Role"
            value={user?.role ?? '—'}
          />
          <ReadOnlyField
            icon={<Hash className="h-2.5 w-2.5" />}
            label="User ID"
            value={user?.id ?? '—'}
          />
          <ReadOnlyField
            icon={<Lock className="h-2.5 w-2.5" />}
            label="Tenant ID"
            value={user?.tenantId ?? '—'}
          />
          <ReadOnlyField
            icon={<Building2 className="h-2.5 w-2.5" />}
            label="Active Company ID"
            value={activeCompanyId ?? '—'}
          />
          <ReadOnlyField
            icon={<Shield className="h-2.5 w-2.5" />}
            label="Subscription Plan"
            value={tenant?.plan?.name ?? 'Starter'}
          />
        </div>

        <p className="mt-4 text-[10px] text-slate-400 font-medium">
          Session details are managed by the authentication system and cannot be
          modified here. To change your password or email, contact your tenant
          administrator.
        </p>
      </SectionCard>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Subscription Plans                                              */}
      {/* ------------------------------------------------------------------ */}
      <SectionCard
        icon={<Shield className="h-4 w-4" />}
        title="Subscription Plan & Billing"
        description="Choose the right features and scale for your organization"
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
          <LoadingState rows={3} message="Loading subscription plans…" />
        ) : plansError ? (
          <ErrorState message={plansError} onRetry={fetchPlans} />
        ) : plans.length === 0 ? (
          <ErrorState message="No subscription plans available." />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((p) => {
            const code = p.code?.toLowerCase() ?? '';
            const isCurrent = tenant?.plan?.name?.toLowerCase() === p.name.toLowerCase() || 
                             (!tenant?.plan && code === 'starter');
            
            // Choose header visual based on plan code
            let headerBg = 'bg-slate-50 border-slate-200';
            let planIcon = <Building2 className="h-5 w-5 text-slate-500" />;
            let badgeText = '';
            let badgeClasses = 'bg-slate-100 text-slate-800';
            let accentColor = 'emerald';
            
            if (code === 'business') {
              headerBg = 'bg-emerald-50/50 border-emerald-100';
              planIcon = <Zap className="h-5 w-5 text-emerald-600" />;
              badgeText = 'Most Popular';
              badgeClasses = 'bg-emerald-100 text-emerald-800';
              accentColor = 'emerald';
            } else if (code === 'enterprise') {
              headerBg = 'bg-indigo-50/50 border-indigo-100';
              planIcon = <Sparkles className="h-5 w-5 text-indigo-600" />;
              badgeText = 'Complete Suite';
              badgeClasses = 'bg-indigo-100 text-indigo-800';
              accentColor = 'indigo';
            }

            return (
              <div 
                key={p.id} 
                className={`flex flex-col rounded-xl border transition-all duration-200 ${
                  isCurrent 
                    ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/10' 
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
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-slate-800">${p.monthlyPrice}</span>
                    <span className="text-xs text-slate-400 font-semibold">/ month</span>
                  </div>
                </div>

                {/* Plan Limits & Features */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-6">
                  <div className="space-y-4">
                    {/* Limits Info */}
                    <div className="grid grid-cols-2 gap-2 pb-4 border-b border-slate-100 text-[11px] text-slate-500 font-semibold">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>{p.maxCompanies >= 999 ? 'Unlimited' : `${p.maxCompanies} ${p.maxCompanies === 1 ? 'Company' : 'Companies'}`}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{p.maxUsers >= 999 ? 'Unlimited Users' : `Up to ${p.maxUsers} Users`}</span>
                      </div>
                    </div>

                    {/* Features List */}
                    {p.features && p.features.length > 0 && (
                      <ul className="space-y-2.5">
                        {p.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-xs font-medium text-slate-600">
                            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Actions Button */}
                  <div className="pt-4 border-t border-slate-100">
                    {isCurrent ? (
                      <div className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-700">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        Active Plan
                      </div>
                    ) : (
                      <Button
                        variant={code === 'starter' ? 'outline' : 'primary'}
                        className={`w-full text-xs font-bold flex items-center justify-center gap-1.5 py-2.5 ${
                          code === 'business' 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-none' 
                            : code === 'enterprise'
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-none'
                            : ''
                        }`}
                        disabled={upgradingPlanId !== null}
                        onClick={() => void handleUpgradePlan(p.id, p.name)}
                      >
                        {upgradingPlanId === p.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Upgrading...
                          </>
                        ) : (
                          `Select ${p.name}`
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </SectionCard>
    </div>
  );
}
