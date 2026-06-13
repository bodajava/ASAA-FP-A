'use client';

import React, { useState } from 'react';
import { Plus, Search, Trash2, Pencil, Upload } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/feedback-states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ImportModal } from '@/components/import-modal';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface CrudPageProps<T extends { id: string }> {
  title: string;
  description?: string;
  endpoint: string;
  columns: Column<T>[];
  /** Render the create/edit form inside the modal body */
  renderForm: (opts: {
    item: T | null; // null = create mode
    onClose: () => void;
    onSubmit: (payload: Record<string, unknown>) => Promise<void>;
    isLoading: boolean;
  }) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  /** If false, hides the Create button */
  canCreate?: boolean;
  /** If false, hides edit/delete row actions */
  canEdit?: boolean;
  canDelete?: boolean;
  /**
   * Set to false for pages that do NOT operate on company-specific data
   * (e.g. the Companies page itself). When false the page renders even
   * without an active company selection.
   * @default true
   */
  requiresCompany?: boolean;
  /**
   * When provided, an "Import" button is shown that opens the ImportModal
   * for the given module key (e.g. "sites", "accounts").
   */
  importModule?: string;
  /** Custom action buttons to render in page header */
  extraHeaderActions?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CrudPage<T extends { id: string }>({
  title,
  description,
  endpoint,
  columns,
  renderForm,
  emptyTitle = 'No records found',
  emptyDescription = 'Create the first record to get started.',
  canCreate = true,
  canEdit = true,
  canDelete = true,
  requiresCompany = true,
  importModule,
  extraHeaderActions,
}: CrudPageProps<T>) {
  const { activeCompanyId } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const list = usePaginatedList<T>({
    endpoint,
    limit: 20,
    // Only gate fetch on company selection when this page requires a company
    enabled: requiresCompany ? Boolean(activeCompanyId) : true,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);
  const [deleteItem, setDeleteItem] = useState<T | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  function openCreate() {
    setEditItem(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(item: T) {
    setEditItem(item);
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditItem(null);
    setFormError(null);
  }

  async function handleSubmit(payload: Record<string, unknown>) {
    setFormLoading(true);
    setFormError(null);
    try {
      if (editItem) {
        await list.update(editItem.id, payload);
        toastSuccess(`${title.replace(/s$/, '')} updated successfully.`);
      } else {
        await list.create(payload);
        toastSuccess(`${title.replace(/s$/, '')} created successfully.`);
      }
      closeForm();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string } | undefined)?.message ??
          'Operation failed.';
        setFormError(msg);
        toastError(msg);
      } else {
        const msg = 'An unexpected error occurred.';
        setFormError(msg);
        toastError(msg);
      }
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      await list.remove(deleteItem.id);
      toastSuccess(`${title.replace(/s$/, '')} deleted successfully.`);
      setDeleteItem(null);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleteLoading(false);
    }
  }

  // Append action column
  const actionColumn: Column<T> = {
    key: '_actions',
    header: '',
    className: 'w-24',
    render: (_val, row) => (
      <div className="flex items-center justify-end gap-1">
        {canEdit && (
          <button
            onClick={() => openEdit(row)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => setDeleteItem(row)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    ),
  };

  const allColumns = [...columns, actionColumn];

  // Show the company-required blocker only for pages that need a company
  if (requiresCompany && !activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <ErrorState
          title="No active company"
          message="Please select a company from the sidebar before viewing this page."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description}>
        <div className="flex items-center gap-2">
          {extraHeaderActions}
          {importModule && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImportOpen(true)}
              id={`${importModule}-import-btn`}
            >
              <Upload className="h-4 w-4" />
              Import CSV / Excel
            </Button>
          )}
          {canCreate && (
            <Button size="sm" onClick={openCreate} id={`${title.toLowerCase().replace(/\s+/g, '-')}-create-btn`}>
              <Plus className="h-4 w-4" />
              Add {title.replace(/s$/, '')}
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search…"
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Search records"
          />
        </div>
        <p className="text-sm text-slate-400">{list.total} records</p>
      </div>

      {/* Table */}
      {list.isLoading ? (
        <LoadingState rows={6} message="Loading…" />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.refresh} />
      ) : list.data.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            <div className="flex items-center gap-2">
              {importModule && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  Import CSV / Excel
                </Button>
              )}
              {canCreate ? (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Add {title.replace(/s$/, '')}
                </Button>
              ) : undefined}
            </div>
          }
        />
      ) : (
        <>
          <TableWrapper<T>
            data={list.data}
            columns={allColumns}
            keyExtractor={(row) => row.id}
          />
          <Pagination
            page={list.page}
            totalPages={list.totalPages}
            total={list.total}
            limit={20}
            onPageChange={list.setPage}
          />
        </>
      )}

      {/* Form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeForm}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {editItem ? `Edit ${title.replace(/s$/, '')}` : `New ${title.replace(/s$/, '')}`}
              </h2>
            </div>
            <div className="px-6 py-5">
              {formError && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {formError}
                </div>
              )}
              {renderForm({
                item: editItem,
                onClose: closeForm,
                onSubmit: handleSubmit,
                isLoading: formLoading,
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteItem !== null}
        message="This action cannot be undone. Are you sure you want to delete this record?"
        isLoading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />

      {/* Import modal */}
      {importOpen && importModule && (
        <ImportModal
          module={importModule}
          moduleLabel={title}
          onClose={() => setImportOpen(false)}
          onSuccess={() => list.refresh()}
        />
      )}
    </div>
  );
}
