'use client';

import React, { useState, useCallback } from 'react';
import {
  Globe,
  Mail,
  MessageCircle,
  Clock,
  HelpCircle,
  Send,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Copy,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useToast } from '@/components/ui/toast';
import api from '@/lib/api';
import type { TranslationKey } from '@/lib/i18n/translations';

/* ─── Constants ─────────────────────────────────────────────────────── */

const SUPPORT_URL = 'https://harvest.com/support';
const SUPPORT_EMAIL = 'bbido761@gmail.com';
const WHATSAPP_NUMBER = '+201018719010';
const WHATSAPP_URL = 'https://wa.me/201018719010';

/* ─── FAQ Item ──────────────────────────────────────────────────────── */

function FaqItem({
  questionKey,
  answerKey,
  t,
}: {
  questionKey: TranslationKey;
  answerKey: TranslationKey;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 text-start text-sm font-medium text-card-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <span>{t(questionKey)}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
          {t(answerKey)}
        </div>
      )}
    </div>
  );
}

/* ─── Copy Button ───────────────────────────────────────────────────── */

function CopyButton({
  text,
  t,
}: {
  text: string;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button size="sm" variant="ghost" onClick={handleCopy}>
      {copied ? (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          {t('page.contactUs.copied')}
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          {t('page.contactUs.copyToClipboard')}
        </>
      )}
    </Button>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function ContactPage() {
  const { t } = useI18n();
  const { success: toastSuccess, error: toastError } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    inquiryType: 'general',
    priority: 'normal',
  });
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSending(true);

      try {
        await api.post('/support/contact', {
          fullName: formData.name,
          email: formData.email,
          inquiryType: formData.inquiryType,
          subject: formData.subject,
          message: formData.message,
          priority: formData.priority,
          sourcePage: window.location.pathname,
        });

        toastSuccess(t('page.contactUs.messageSent'));
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
          inquiryType: 'general',
          priority: 'normal',
        });
      } catch {
        toastError(t('page.contactUs.messageFailed'));
      } finally {
        setIsSending(false);
      }
    },
    [formData, t, toastSuccess, toastError],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('page.contactUs.title')}
        description={t('page.contactUs.description')}
      />

      {/* ─── Local Desktop Notice ────────────────────────────────────── */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t('page.contactUs.localDesktopNotice')}
          </p>
        </div>
      </Card>

      {/* ─── Contact Information Cards ──────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Globe className="h-4 w-4" />
          </span>
          {t('page.contactUs.contactInformation')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* WhatsApp */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('page.contactUs.whatsapp')}
                </p>
                <p className="text-sm font-medium text-card-foreground break-all">{WHATSAPP_NUMBER}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(WHATSAPP_URL, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('page.contactUs.chatOnWhatsApp')}
              </Button>
              <CopyButton text={WHATSAPP_URL} t={t} />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('page.contactUs.email')}
                </p>
                <p className="text-sm font-medium text-card-foreground break-all">{SUPPORT_EMAIL}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={SUPPORT_EMAIL} t={t} />
            </div>
          </div>

          {/* Support Website */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('page.contactUs.website')}
                </p>
                <p className="text-sm font-medium text-card-foreground break-all">harvest.com/support</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('page.contactUs.visitWebsite')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Response Time ───────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            {t('page.contactUs.responseTime')}
          </p>
        </div>
      </Card>

      {/* ─── Two Column Layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Business Hours + FAQ */}
        <div className="space-y-6">
          {/* Business Hours */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="h-4 w-4" />
              </span>
              {t('page.contactUs.businessHours')}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                <span className="text-sm text-card-foreground">
                  {t('page.contactUs.businessHoursWeekdays')}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                <span className="text-sm text-card-foreground">
                  {t('page.contactUs.businessHoursWeekend')}
                </span>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HelpCircle className="h-4 w-4" />
              </span>
              {t('page.contactUs.faq')}
            </h2>
            <div className="space-y-3">
              <FaqItem
                questionKey="page.contactUs.faqQuestion1"
                answerKey="page.contactUs.faqAnswer1"
                t={t}
              />
              <FaqItem
                questionKey="page.contactUs.faqQuestion2"
                answerKey="page.contactUs.faqAnswer2"
                t={t}
              />
              <FaqItem
                questionKey="page.contactUs.faqQuestion3"
                answerKey="page.contactUs.faqAnswer3"
                t={t}
              />
              <FaqItem
                questionKey="page.contactUs.faqQuestion4"
                answerKey="page.contactUs.faqAnswer4"
                t={t}
              />
              <FaqItem
                questionKey="page.contactUs.faqQuestion5"
                answerKey="page.contactUs.faqAnswer5"
                t={t}
              />
              <FaqItem
                questionKey="page.contactUs.faqQuestion6"
                answerKey="page.contactUs.faqAnswer6"
                t={t}
              />
            </div>
          </section>
        </div>

        {/* Contact Form */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Send className="h-4 w-4" />
            </span>
            {t('page.contactUs.contactForm')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="contact-name"
              type="text"
              label={t('page.contactUs.fullName')}
              placeholder={t('page.contactUs.fullNamePlaceholder')}
              required
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
            />

            <Input
              id="contact-email"
              type="email"
              label={t('page.contactUs.emailAddress')}
              placeholder={t('page.contactUs.emailPlaceholder')}
              required
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
            />

            <div>
              <label className="mb-1.5 block text-xs font-medium text-card-foreground">
                {t('page.contactUs.inquiryType')}
              </label>
              <select
                value={formData.inquiryType}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, inquiryType: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-input bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={t('page.contactUs.inquiryType')}
              >
                <option value="general">{t('page.contactUs.inquiryGeneral')}</option>
                <option value="excel_upload">{t('page.contactUs.inquiryExcelUpload')}</option>
                <option value="template_download">{t('page.contactUs.inquiryTemplateDownload')}</option>
                <option value="dashboard_numbers">{t('page.contactUs.inquiryDashboardIncorrect')}</option>
                <option value="dark_mode">{t('page.contactUs.inquiryDarkMode')}</option>
                <option value="login">{t('page.contactUs.inquiryLogin')}</option>
                <option value="import_order">{t('page.contactUs.inquiryImportOrder')}</option>
                <option value="missing_master_data">{t('page.contactUs.inquiryMissingMaster')}</option>
                <option value="scenario_forecast">{t('page.contactUs.inquiryScenario')}</option>
                <option value="exchange_rate">{t('page.contactUs.inquiryExchangeRate')}</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-card-foreground">
                {t('page.contactUs.priority')}
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, priority: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-input bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={t('page.contactUs.priority')}
              >
                <option value="low">{t('page.contactUs.priorityLow')}</option>
                <option value="normal">{t('page.contactUs.priorityNormal')}</option>
                <option value="high">{t('page.contactUs.priorityHigh')}</option>
                <option value="urgent">{t('page.contactUs.priorityUrgent')}</option>
              </select>
            </div>

            <Input
              id="contact-subject"
              type="text"
              label={t('page.contactUs.subject')}
              placeholder={t('page.contactUs.subjectPlaceholder')}
              required
              value={formData.subject}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subject: e.target.value }))
              }
            />

            <div>
              <label
                htmlFor="contact-message"
                className="mb-1.5 block text-xs font-medium text-card-foreground"
              >
                {t('page.contactUs.message')}
              </label>
              <textarea
                id="contact-message"
                rows={5}
                placeholder={t('page.contactUs.messagePlaceholder')}
                required
                value={formData.message}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, message: e.target.value }))
                }
                className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                aria-label={t('page.contactUs.message')}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isSending}
            >
              <Send className="h-4 w-4" />
              {isSending ? t('page.contactUs.sending') : t('page.contactUs.sendMessage')}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
