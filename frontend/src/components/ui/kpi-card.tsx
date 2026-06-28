import * as React from 'react';
import Link from 'next/link';
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
  href?: string;
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
  href,
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

  const cardContent = (
    <div
      className={cn(
        'relative rounded-xl border border-border p-5 shadow-sm cursor-pointer',
        'bg-card text-card-foreground',
        'transition-all duration-200 hover:shadow-md hover:border-primary/40',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="mt-2 h-8 w-32 animate-pulse rounded bg-secondary" />
      ) : (
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-card-foreground">{value}</p>
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

      {href && (
        <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          View report →
        </p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-xl">{cardContent}</Link>;
  }

  return cardContent;
}

export { KpiCard };
