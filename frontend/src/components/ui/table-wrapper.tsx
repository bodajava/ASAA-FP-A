import * as React from 'react';
import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Column<T> {
  key: keyof T | string;
  header: React.ReactNode;
  className?: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

export interface TableWrapperProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor?: (row: T, index: number) => string;
  className?: string;
  caption?: string;
  /** Renders in the table footer row when provided */
  footerRow?: React.ReactNode;
  onRowClick?: (row: T) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function TableWrapper<T>({
  data,
  columns,
  keyExtractor,
  className,
  caption,
  footerRow,
  onRowClick,
}: TableWrapperProps<T>) {
  const extractKey =
    typeof keyExtractor === 'function'
      ? keyExtractor
      : (row: any, index: number) => {
          if (row && typeof row === 'object') {
            if ('id' in row && row.id != null) return String(row.id);
            if ('_id' in row && row._id != null) return String(row._id);
            if ('code' in row && row.code != null) return String(row.code);
          }
          return String(index);
        };

  return (
    <div
      className={cn(
        'w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      <table className="w-full caption-bottom text-sm">
        {caption && (
          <caption className="mt-4 text-xs text-slate-500">{caption}</caption>
        )}

        {/* Head */}
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                scope="col"
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-slate-100">
          {data.map((row, rowIndex) => (
            <tr
              key={extractKey(row, rowIndex)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'transition-colors duration-100',
                onRowClick &&
                  'cursor-pointer hover:bg-slate-50',
              )}
            >
              {columns.map((col) => {
                const rawValue = (row as Record<string, unknown>)[
                  String(col.key)
                ];
                return (
                  <td
                    key={String(col.key)}
                    className={cn(
                      'px-4 py-3 text-slate-700',
                      col.className,
                    )}
                  >
                    {col.render
                      ? col.render(rawValue, row, rowIndex)
                      : String(rawValue ?? '-')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>

        {footerRow && (
          <tfoot className="border-t border-slate-200 bg-slate-50 font-medium">
            {footerRow}
          </tfoot>
        )}
      </table>
    </div>
  );
}

export { TableWrapper };
