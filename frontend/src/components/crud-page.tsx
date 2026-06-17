'use client';

import React, { useState } from 'react';
import { Plus, Search, Trash2, Pencil, Upload } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/feedback-states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { ImportModal } from '@/components/import-modal';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { TranslationKey } from '@/lib/i18n/translations';
import axios from 'axios';

export interface CrudPageProps<T extends { id: string }> {
  title: string;
  description?: string;
  endpoint: string;
  columns: Column<T>[];
  /** Map column keys to TranslationKey for automatic header translation */
  columnHeaders?: Record<string, TranslationKey>;
  renderForm: (opts: {
    item: T | null;
    onClose: () => void;
    onSubmit: (payload: Record<string, unknown>) => Promise<void>;
    isLoading: boolean;
  }) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  requiresCompany?: boolean;
  importModule?: string;
  extraHeaderActions?: React.ReactNode;
}

export function CrudPage<T extends { id: string }>({
  title,
  description,
  endpoint,
  columns,
  columnHeaders,
  renderForm,
  emptyTitle,
  emptyDescription,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  requiresCompany = true,
  importModule,
  extraHeaderActions,
}: CrudPageProps<T>) {
  const { activeCompanyId } = useAuth();
  const { t } = useI18n();
  const { success: toastSuccess, error: toastError } = useToast();

  const list = usePaginatedList<T>({
    endpoint,
    limit: 20,
    enabled: requiresCompany ? Boolean(activeCompanyId) : true,
  });

  const resolvedColumns = React.useMemo(
    () =>
      columns.map((col) => {
        const headerKey = col.headerKey ?? (columnHeaders ? columnHeaders[col.key as string] : undefined);
        if (headerKey) {
          return { ...col, header: t(headerKey) };
        }
        return col;
      }),
    [columns, columnHeaders, t],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);
  const [deleteItem, setDeleteItem] = useState<T | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const singular = title.replace(/s$/, '');

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
        toastSuccess(t('common.updatedSuccess'));
      } else {
        await list.create(payload);
        toastSuccess(t('common.createdSuccess'));
      }
      closeForm();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string } | undefined)?.message ??
          t('error.operationFailed');
        setFormError(msg);
        toastError(msg);
      } else {
        const msg = t('error.unexpectedError');
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
      toastSuccess(t('common.deletedSuccess'));
      setDeleteItem(null);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : t('common.deleteFailed'));
    } finally {
      setDeleteLoading(false);
    }
  }

  const actionColumn: Column<T> = {
    key: '_actions',
    header: '',
    className: 'w-24',
    render: (_val, row) => (
      <div className="flex items-center justify-end gap-1">
        {canEdit && (
          <button
            onClick={() => openEdit(row)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
            aria-label={t('common.edit')}
            title={t('common.edit')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => setDeleteItem(row)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 cursor-pointer"
            aria-label={t('common.delete')}
            title={t('common.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    ),
  };

  const allColumns = [...resolvedColumns, actionColumn];

  if (requiresCompany && !activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <ErrorState
          title={t('common.noCompany')}
          message={t('common.selectCompany')}
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
              {t('common.import')} CSV / Excel
            </Button>
          )}
          {canCreate && (
            <Button size="sm" onClick={openCreate} id={`${title.toLowerCase().replace(/\s+/g, '-')}-create-btn`}>
              <Plus className="h-4 w-4" />
              {`${t('common.create')} ${singular}`}
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={`${t('common.search')}…`}
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={t('common.search')}
          />
        </div>
        <p className="text-sm text-muted-foreground">{list.total} {t('common.entries')}</p>
      </div>

      {/* Table */}
      {list.isLoading ? (
        <LoadingState rows={6} />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.refresh} />
      ) : list.data.length === 0 ? (
        <EmptyState
          title={emptyTitle ?? t('common.noResults')}
          description={emptyDescription ?? t('common.noData')}
          action={
            <div className="flex items-center gap-2">
              {importModule && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  {t('common.import')} CSV / Excel
                </Button>
              )}
              {canCreate ? (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> {t('common.create')} {singular}
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
        <Modal
          open={formOpen}
          onClose={closeForm}
          title={editItem ? `${t('common.edit')} ${singular}` : `${t('common.create')} ${singular}`}
          size="lg"
        >
          {formError && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
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
        </Modal>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteItem !== null}
        title={t('common.confirmDelete')}
        message={t('common.confirmDeleteMessage')}
        confirmLabel={t('common.delete')}
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
