import * as React from 'react';
import { cn } from '@/lib/utils/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
  muted: 'bg-slate-50 text-slate-500',
};

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

// Convenience helpers for common status values
export function statusBadge(status: string): React.ReactElement {
  const s = status.toLowerCase();
  const variant: BadgeVariant =
    s === 'active' ? 'success'
    : s === 'inactive' ? 'muted'
    : s === 'pending' ? 'warning'
    : 'default';
  return <Badge variant={variant}>{status}</Badge>;
}

export function boolBadge(value: boolean): React.ReactElement {
  return (
    <Badge variant={value ? 'success' : 'muted'}>
      {value ? 'Active' : 'Inactive'}
    </Badge>
  );
}
