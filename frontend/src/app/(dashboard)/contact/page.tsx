'use client';

import React, { useState, useCallback } from 'react';
import {
  Globe,
  Mail,
  MessageCircle,
  Phone,
  Clock,
  HelpCircle,
  Send,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useToast } from '@/components/ui/toast';
import type { TranslationKey } from '@/lib/i18n/translations';

/* ─── Constants ─────────────────────────────────────────────────────── */

const SUPPORT_URL = 'https://idiibi.com/support.php';
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

/* ─── Contact Card ──────────────────────────────────────────────────── */

function ContactCard({
  icon: Icon,
  label,
  value,
  href,
  actionLabel,
  onCopy,
  t,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href: string;
  actionLabel: string;
  onCopy?: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [onCopy]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-sm font-medium text-card-foreground break-all">{value}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {actionLabel}
        </Button>
        {onCopy && (
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
        )}
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function ContactPage() {
  const { t } = useI18n();
  const { success: toastSuccess } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    inquiryType: 'general',
  });
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setIsSending(true);

      // Build mailto link
      const subject = encodeURIComponent(
        `[${formData.inquiryType}] ${formData.subject}`,
      );
      const body = encodeURIComponent(
        `Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`,
      );
      window.open(
        `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`,
        '_blank',
      );

      setTimeout(() => {
        setIsSending(false);
        toastSuccess(t('page.contactUs.messageSent'));
        setFormData({ name: '', email: '', subject: '', message: '', inquiryType: 'general' });
      }, 1000);
    },
    [formData, t, toastSuccess],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('page.contactUs.title')}
        description={t('page.contactUs.description')}
      />

      {/* ─── Contact Information Cards ──────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Phone className="h-4 w-4" />
          </span>
          {t('page.contactUs.contactInformation')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ContactCard
            icon={Globe}
            label={t('page.contactUs.website')}
            value="idiibi.com/support.php"
            href={SUPPORT_URL}
            actionLabel={t('page.contactUs.visitWebsite')}
            t={t}
          />
          <ContactCard
            icon={Mail}
            label={t('page.contactUs.email')}
            value={SUPPORT_EMAIL}
            href={`mailto:${SUPPORT_EMAIL}`}
            actionLabel={t('page.contactUs.sendEmail')}
            onCopy={() => navigator.clipboard.writeText(SUPPORT_EMAIL)}
            t={t}
          />
          <ContactCard
            icon={MessageCircle}
            label={t('page.contactUs.whatsapp')}
            value={WHATSAPP_NUMBER}
            href={WHATSAPP_URL}
            actionLabel={t('page.contactUs.chatOnWhatsApp')}
            onCopy={() => navigator.clipboard.writeText(WHATSAPP_NUMBER)}
            t={t}
          />
        </div>
      </section>

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
                <option value="general">{t('page.contactUs.generalInquiry')}</option>
                <option value="technical">{t('page.contactUs.technicalSupport')}</option>
                <option value="sales">{t('page.contactUs.salesInquiry')}</option>
              </select>
            </div>

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
