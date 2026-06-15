'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/i18n-context';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!dismissed) setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 rounded-lg border border-emerald-200 bg-white p-4 shadow-lg dark:border-emerald-800 dark:bg-slate-800">
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        aria-label="Close"
      >
        <X size={16} />
      </button>
      <p className="mb-3 text-sm font-medium text-slate-800 dark:text-slate-100">
        {t('common.installAppDescription')}
      </p>
      <button
        onClick={handleInstall}
        className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
      >
        {t('common.install')}
      </button>
    </div>
  );
}
