import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------
type Variant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'link';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500',
  secondary:
    'bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400',
  outline:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400',
  ghost:
    'text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500',
  link: 'text-emerald-600 underline-offset-4 hover:underline focus-visible:ring-emerald-500',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 rounded-md px-3 text-xs',
  md: 'h-9 rounded-lg px-4 py-2 text-sm',
  lg: 'h-11 rounded-lg px-6 text-base',
  icon: 'h-9 w-9 rounded-lg',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  asChild?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base
          'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          // Variant + size
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button };
