import * as React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type TrendDirection = 'up' | 'down' | 'neutral';

export interface KpiCardProps {
  title: string;
  value: string | number;
  /** e.g. "+12.5%" or "−3.2%" */
  change?: string;
  trendDirection?: TrendDirection;
  /** Icon or illustration placed at top-right */
  icon?: React.ReactNode;
  description?: string;
  className?: string;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function KpiCard({
  title,
  value,
  change,
  trendDirection = 'neutral',
  icon,
  description,
  className,
  isLoading = false,
}: KpiCardProps) {
  const trendColour =
    trendDirection === 'up'
      ? 'text-emerald-600'
      : trendDirection === 'down'
        ? 'text-red-500'
        : 'text-slate-500';

  const TrendIcon =
    trendDirection === 'up'
      ? TrendingUp
      : trendDirection === 'down'
        ? TrendingDown
        : null;

  return (
    <div
      className={cn(
        'relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm',
        'transition-shadow duration-200 hover:shadow-md',
        className,
      )}
    >
      {/* Top row: title + icon */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      {isLoading ? (
        <div className="mt-2 h-8 w-32 animate-pulse rounded bg-slate-200" />
      ) : (
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      )}

      {/* Trend / description */}
      <div className="mt-1 flex items-center gap-1.5">
        {change && TrendIcon && (
          <TrendIcon
            className={cn('h-3.5 w-3.5', trendColour)}
            aria-hidden="true"
          />
        )}
        {change && (
          <span className={cn('text-xs font-medium', trendColour)}>
            {change}
          </span>
        )}
        {description && (
          <span className="text-xs text-slate-400">{description}</span>
        )}
      </div>
    </div>
  );
}

export { KpiCard };
