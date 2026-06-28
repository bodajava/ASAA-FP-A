import * as React from 'react';
import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // action slot (buttons, etc.)
  className?: string;
  backHref?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-card-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {children && (
        <div className="mt-3 flex shrink-0 items-center gap-2 sm:mt-0">
          {children}
        </div>
      )}
    </div>
  );
}

export { PageHeader };
