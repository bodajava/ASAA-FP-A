'use client';

import React, { useState, useMemo } from 'react';
import { Check, ChevronRight, ChevronLeft, Building2, DollarSign, Calendar, Ruler, BookOpen, ClipboardCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/i18n-context';
import { MONTH_NAMES } from '@/lib/constants';

interface CompanyWizardData {
  name: string;
  code: string;
  industryType: string;
  taxNumber: string;
  currency: string;
  fiscalYearStart: number;
  createDefaultUnits: boolean;
  createDefaultAccounts: boolean;
}

interface CompanyWizardProps {
  onSubmit: (data: CompanyWizardData) => Promise<void>;
  isLoading: boolean;
}

const CURRENCIES = [
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];

const INDUSTRY_TYPES = ['mixed', 'retail', 'manufacturing', 'services'];

const DEFAULT_UNITS = [
  { name: 'Pieces', symbol: 'pc' },
  { name: 'Kg', symbol: 'kg' },
  { name: 'Liters', symbol: 'L' },
  { name: 'Meters', symbol: 'm' },
  { name: 'Box', symbol: 'box' },
  { name: 'Carton', symbol: 'ctn' },
];

const DEFAULT_ACCOUNT_CATEGORIES = [
  { type: 'revenue', icon: '💵' },
  { type: 'expense', icon: '📉' },
  { type: 'asset', icon: '🏦' },
  { type: 'liability', icon: '💳' },
  { type: 'equity', icon: '📊' },
];

const STEP_TITLES_EN = ['Company Information', 'Currency', 'Fiscal Year', 'Default Units', 'Default Accounts', 'Review & Create'];
const STEP_TITLES_AR = ['معلومات الشركة', 'العملة', 'السنة المالية', 'الوحدات الافتراضية', 'الحسابات الافتراضية', 'مراجعة وإنشاء'];

export function CompanyWizard({ onSubmit, isLoading }: CompanyWizardProps) {
  const { t, locale } = useI18n();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<CompanyWizardData>({
    name: '',
    code: '',
    industryType: 'mixed',
    taxNumber: '',
    currency: 'EGP',
    fiscalYearStart: 1,
    createDefaultUnits: true,
    createDefaultAccounts: true,
  });

  const stepTitles = locale === 'ar' ? STEP_TITLES_AR : STEP_TITLES_EN;

  const selectedCurrencySymbol = useMemo(
    () => CURRENCIES.find((c) => c.code === data.currency)?.symbol ?? '',
    [data.currency],
  );

  const endMonth = useMemo(() => {
    const end = data.fiscalYearStart === 1 ? 12 : data.fiscalYearStart - 1;
    return MONTH_NAMES[end];
  }, [data.fiscalYearStart]);

  const canNext = useMemo(() => {
    if (step === 0) return data.name.trim().length > 0 && data.code.trim().length > 0;
    return true;
  }, [step, data.name, data.code]);

  function update<K extends keyof CompanyWizardData>(key: K, value: CompanyWizardData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function handleNext() {
    if (step < 5 && canNext) setStep((s) => s + 1);
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function handleFinalSubmit() {
    await onSubmit(data);
  }

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator currentStep={step} totalSteps={6} titles={stepTitles} />

      <div className="min-h-[320px]">
        {step === 0 && (
          <StepCompanyInfo data={data} update={update} />
        )}
        {step === 1 && (
          <StepCurrency data={data} update={update} symbol={selectedCurrencySymbol} />
        )}
        {step === 2 && (
          <StepFiscalYear data={data} update={update} endMonth={endMonth} />
        )}
        {step === 3 && (
          <StepDefaultUnits enabled={data.createDefaultUnits} onToggle={(v) => update('createDefaultUnits', v)} />
        )}
        {step === 4 && (
          <StepDefaultAccounts enabled={data.createDefaultAccounts} onToggle={(v) => update('createDefaultAccounts', v)} />
        )}
        {step === 5 && (
          <StepReview data={data} endMonth={endMonth} currencySymbol={selectedCurrencySymbol} />
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={handleBack} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>

        {step < 5 ? (
          <Button size="sm" type="button" onClick={handleNext} disabled={!canNext}>
            {t('common.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" type="button" onClick={handleFinalSubmit} isLoading={isLoading} disabled={isLoading}>
            <ClipboardCheck className="h-4 w-4" />
            {t('page.companies.createCompany')}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────── Step Indicator ────────────────────────── */

function StepIndicator({ currentStep, totalSteps, titles }: { currentStep: number; totalSteps: number; titles: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalSteps }, (_, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                i < currentStep
                  ? 'bg-emerald-500 text-white'
                  : i === currentStep
                    ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="mt-1 hidden text-[10px] font-medium text-slate-500 sm:block">{titles[i]}</span>
          </div>
          {i < totalSteps - 1 && (
            <div className={`mb-5 h-0.5 flex-1 ${i < currentStep ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ────────────────────────── Step 1: Company Info ────────────────────────── */

function StepCompanyInfo({ data, update }: { data: CompanyWizardData; update: <K extends keyof CompanyWizardData>(key: K, value: CompanyWizardData[K]) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-700">
        <Building2 className="h-5 w-5" />
        <h3 className="text-sm font-semibold">{t('page.companies.createTitle')}</h3>
      </div>
      <Input
        id="wiz-company-name"
        label={t('page.companies.companyName')}
        required
        value={data.name}
        onChange={(e) => update('name', e.target.value)}
        placeholder="e.g. Acme Corp"
      />
      <Input
        id="wiz-company-code"
        label={t('common.code')}
        required
        value={data.code}
        onChange={(e) => update('code', e.target.value.toUpperCase())}
        placeholder="e.g. ACME"
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="wiz-industry" className="text-sm font-medium text-slate-700">{t('common.type')}</label>
        <select
          id="wiz-industry"
          value={data.industryType}
          onChange={(e) => update('industryType', e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {INDUSTRY_TYPES.map((type) => (
            <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
          ))}
        </select>
      </div>
      <Input
        id="wiz-tax-number"
        label={`${t('common.id')} (${t('common.optional')})`}
        value={data.taxNumber}
        onChange={(e) => update('taxNumber', e.target.value)}
        placeholder="Tax registration number"
      />
    </div>
  );
}

/* ────────────────────────── Step 2: Currency ────────────────────────── */

function StepCurrency({ data, update, symbol }: { data: CompanyWizardData; update: <K extends keyof CompanyWizardData>(key: K, value: CompanyWizardData[K]) => void; symbol: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-700">
        <DollarSign className="h-5 w-5" />
        <h3 className="text-sm font-semibold">{t('common.currency')}</h3>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="wiz-currency" className="text-sm font-medium text-slate-700">{t('page.settings.defaultCurrency')}</label>
        <select
          id="wiz-currency"
          value={data.currency}
          onChange={(e) => update('currency', e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
          ))}
        </select>
      </div>
      {symbol && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="text-2xl font-bold text-emerald-700">{symbol}</span>
          <span className="text-sm text-emerald-600">{data.currency}</span>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Step 3: Fiscal Year ────────────────────────── */

function StepFiscalYear({ data, update, endMonth }: { data: CompanyWizardData; update: <K extends keyof CompanyWizardData>(key: K, value: CompanyWizardData[K]) => void; endMonth: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-700">
        <Calendar className="h-5 w-5" />
        <h3 className="text-sm font-semibold">{t('common.fiscalYear')}</h3>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="wiz-fiscal-start" className="text-sm font-medium text-slate-700">{t('page.settings.fiscalYearStart')}</label>
        <select
          id="wiz-fiscal-start"
          value={data.fiscalYearStart}
          onChange={(e) => update('fiscalYearStart', Number(e.target.value))}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {MONTH_NAMES.slice(1).map((name, i) => (
            <option key={i + 1} value={i + 1}>{name}</option>
          ))}
        </select>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span className="font-medium">{t('common.startDate')}:</span> {MONTH_NAMES[data.fiscalYearStart]}
        <span className="mx-2">→</span>
        <span className="font-medium">{t('common.endDate')}:</span> {endMonth}
      </div>
    </div>
  );
}

/* ────────────────────────── Step 4: Default Units ────────────────────────── */

function StepDefaultUnits({ enabled, onToggle }: { enabled: boolean; onToggle: (v: boolean) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-700">
        <Ruler className="h-5 w-5" />
        <h3 className="text-sm font-semibold">{t('page.companies.defaultUnits')}</h3>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
        />
        <span className="text-sm text-slate-700">{t('page.companies.createDefaultUnits')}</span>
      </label>
      {enabled && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">{t('page.companies.preview')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEFAULT_UNITS.map((u) => (
              <div key={u.symbol} className="flex items-center gap-2 rounded-md border border-slate-100 bg-white px-3 py-2">
                <span className="text-xs font-semibold text-emerald-600">{u.symbol}</span>
                <span className="text-xs text-slate-600">{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Step 5: Default Accounts ────────────────────────── */

function StepDefaultAccounts({ enabled, onToggle }: { enabled: boolean; onToggle: (v: boolean) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-700">
        <BookOpen className="h-5 w-5" />
        <h3 className="text-sm font-semibold">{t('page.companies.defaultChartOfAccounts')}</h3>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
        />
        <span className="text-sm text-slate-700">{t('page.companies.createDefaultAccounts')}</span>
      </label>
      {enabled && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">{t('page.companies.accountCategories')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEFAULT_ACCOUNT_CATEGORIES.map((cat) => (
              <div key={cat.type} className="flex items-center gap-2 rounded-md border border-slate-100 bg-white px-3 py-2">
                <span className="text-lg">{cat.icon}</span>
                <span className="text-xs font-medium text-slate-700 capitalize">{cat.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Step 6: Review ────────────────────────── */

function StepReview({ data, endMonth, currencySymbol }: { data: CompanyWizardData; endMonth: string; currencySymbol: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-700">
        <ClipboardCheck className="h-5 w-5" />
        <h3 className="text-sm font-semibold">{t('page.companies.createCompany')}</h3>
      </div>

      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
        <ReviewRow label={t('page.companies.companyName')} value={data.name} />
        <ReviewRow label={t('common.code')} value={data.code} />
        <ReviewRow label={t('common.type')} value={data.industryType} />
        {data.taxNumber && <ReviewRow label={t('common.id')} value={data.taxNumber} />}
        <ReviewRow label={t('common.currency')} value={`${currencySymbol} ${data.name ? data.currency : data.currency}`} />
        <ReviewRow
          label={t('common.fiscalYear')}
          value={`${MONTH_NAMES[data.fiscalYearStart]} → ${endMonth}`}
        />
        <ReviewRow label={t('page.companies.defaultUnits')} value={data.createDefaultUnits ? t('common.yes') : t('common.no')} />
        <ReviewRow label={t('page.companies.defaultAccounts')} value={data.createDefaultAccounts ? t('common.yes') : t('common.no')} />
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}
