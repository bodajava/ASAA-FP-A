'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { useI18n } from '@/lib/i18n/i18n-context';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400" />
          </span>
          <h2
            id="confirm-title"
            className="text-base font-semibold text-card-foreground"
          >
            {title ?? t('common.confirmDelete')}
          </h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onCancel}
            type="button"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="flex-1"
            onClick={onConfirm}
            isLoading={isLoading}
            type="button"
          >
            {confirmLabel ?? t('common.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}
