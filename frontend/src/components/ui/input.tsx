import * as React from 'react';
import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, startIcon, endIcon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {startIcon && (
            <span className="pointer-events-none absolute left-3 flex items-center text-slate-400">
              {startIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error
                ? `${inputId}-error`
                : hint
                  ? `${inputId}-hint`
                  : undefined
            }
            className={cn(
              'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2',
              'text-sm text-slate-900 shadow-sm placeholder:text-slate-400',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50',
              startIcon && 'pl-10',
              endIcon && 'pr-10',
              error &&
                'border-red-400 focus-visible:ring-red-500',
              className,
            )}
            {...props}
          />

          {endIcon && (
            <span className="pointer-events-none absolute right-3 flex items-center text-slate-400">
              {endIcon}
            </span>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-red-600"
          >
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
