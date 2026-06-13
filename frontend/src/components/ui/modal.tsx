'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from './button';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Footer slot – if omitted renders nothing */
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
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
  // Close on Escape
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full rounded-2xl border border-slate-200 bg-white shadow-xl',
          sizeMap[size],
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2
              id="modal-title"
              className="text-base font-semibold text-slate-900"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Convenience: Modal Form Footer
// ---------------------------------------------------------------------------
export interface ModalFooterProps {
  onCancel: () => void;
  submitLabel?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
}

export function ModalFooter({
  onCancel,
  submitLabel = 'Save',
  isLoading = false,
  isDisabled = false,
}: ModalFooterProps) {
  return (
    <>
      <Button variant="outline" size="sm" onClick={onCancel} type="button">
        Cancel
      </Button>
      <Button
        variant="primary"
        size="sm"
        type="submit"
        isLoading={isLoading}
        disabled={isDisabled}
      >
        {submitLabel}
      </Button>
    </>
  );
}
