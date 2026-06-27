'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from './button';
import { useI18n } from '@/lib/i18n/i18n-context';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) {
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        className={cn(
          'relative z-10 w-full rounded-2xl border border-border bg-card shadow-xl',
          sizeMap[size],
          className,
        )}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2
              id="modal-title"
              className="text-base font-semibold text-card-foreground"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export interface ModalFooterProps {
  onCancel: () => void;
  submitLabel?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
}

export function ModalFooter({
  onCancel,
  submitLabel,
  isLoading = false,
  isDisabled = false,
}: ModalFooterProps) {
  const { t } = useI18n();
  return (
    <>
      <Button variant="outline" size="sm" onClick={onCancel} type="button">
        {t('common.cancel')}
      </Button>
      <Button
        variant="primary"
        size="sm"
        type="submit"
        isLoading={isLoading}
        disabled={isDisabled}
      >
        {submitLabel ?? t('common.save')}
      </Button>
    </>
  );
}
