import * as React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string;
  trendDirection?: TrendDirection;
  icon?: React.ReactNode;
  description?: string;
  className?: string;
  isLoading?: boolean;
}

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
      ? 'text-emerald-600 dark:text-emerald-400'
      : trendDirection === 'down'
        ? 'text-red-500 dark:text-red-400'
        : 'text-muted-foreground';

  const TrendIcon =
    trendDirection === 'up'
      ? TrendingUp
      : trendDirection === 'down'
        ? TrendingDown
        : null;

  return (
    <div
      className={cn(
        'relative rounded-xl border border-border bg-card p-5 shadow-sm',
        'transition-shadow duration-200 hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            {icon}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="mt-2 h-8 w-32 animate-pulse rounded bg-secondary" />
      ) : (
        <p className="mt-2 text-2xl font-bold text-card-foreground">{value}</p>
      )}

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
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  );
}

export { KpiCard };
