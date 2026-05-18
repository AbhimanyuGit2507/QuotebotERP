import React from 'react';

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: T[keyof T], row: T, rowIndex: number) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyField: keyof T;
  title?: string;
  showPagination?: boolean;
  currentPage?: number;
  totalRecords?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  footer?: React.ReactNode;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string | number;
  // New enhanced props
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (columnKey: string, order: 'asc' | 'desc') => void;
  loading?: boolean;
  page?: number;
  total?: number;
}

function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  title,
  showPagination = false,
  currentPage = 1,
  totalRecords = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  footer,
  emptyMessage = 'No data available',
  className = '',
  onRowClick,
  selectedRowKey,
  sortBy,
  sortOrder,
  onSort,
  loading = false,
  page,
  total,
}: DataTableProps<T>) {
  // Support both `page`/`total` and `currentPage`/`totalRecords` for backward compat
  const activePage = page ?? currentPage;
  const activeTotal = total ?? totalRecords;
  const totalPages = Math.ceil(activeTotal / pageSize);
  const startRecord = (activePage - 1) * pageSize + 1;
  const endRecord = Math.min(activePage * pageSize, activeTotal);

  const getNestedValue = (obj: T, key: string): unknown => {
    const keys = key.split('.');
    let value: unknown = obj;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    return value;
  };

  const handleHeaderClick = (col: DataTableColumn<T>) => {
    if (!onSort || col.sortable === false) return;
    const colKey = String(col.key);
    const newOrder: 'asc' | 'desc' =
      sortBy === colKey && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(colKey, newOrder);
  };

  const renderSortIndicator = (col: DataTableColumn<T>) => {
    if (!onSort || col.sortable === false) return null;
    const colKey = String(col.key);
    if (sortBy !== colKey) {
      return <span className="text-slate-300 ml-1">⇅</span>;
    }
    return (
      <span className="ml-1 text-[var(--erp-accent)]">
        {sortOrder === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  const renderLoadingSkeleton = () => {
    const skeletonRows = Array.from({ length: Math.min(pageSize, 5) });
    return (
      <>
        {skeletonRows.map((_, rowIdx) => (
          <tr key={`skeleton-${rowIdx}`} className="animate-pulse">
            {columns.map((col, colIdx) => (
              <td
                key={`skeleton-${rowIdx}-${colIdx}`}
                className={`px-3 py-3 ${col.cellClassName || ''}`}
              >
                <div
                  className="h-4 bg-slate-200 rounded"
                  style={{ width: `${60 + Math.random() * 30}%` }}
                />
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  };

  const renderEmptyState = () => (
    <tr>
      <td colSpan={columns.length} className="px-3 py-12 text-center">
        <div className="flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
            search_off
          </span>
          <p className="text-sm text-slate-400 italic">{emptyMessage}</p>
          <p className="text-[11px] text-slate-300 mt-1">
            Try adjusting your filters or search terms
          </p>
        </div>
      </td>
    </tr>
  );

  const showPaginationBar = showPagination || (activeTotal > 0 && onPageChange);

  return (
    <div className={`border border-[var(--erp-border)] rounded overflow-hidden ${className}`}>
      {/* Header */}
      {(title || showPaginationBar) && (
        <div className="px-3 sm:px-5 py-3 bg-slate-50 border-b border-[var(--erp-border)] flex flex-wrap justify-between items-center gap-2">
          {title && (
            <span className="text-sm font-bold text-[var(--erp-text-muted)] uppercase tracking-widest">{title}</span>
          )}
          {showPaginationBar && activeTotal > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[13px] text-[var(--erp-text-muted)] italic">
                Showing {startRecord}-{endRecord} of {activeTotal} records
              </span>
              {onPageSizeChange && (
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="text-[12px] border border-[var(--erp-border)] rounded px-2 py-1 bg-white"
                >
                  {[10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
              )}
              <div className="flex items-center gap-1">
                <button
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-[13px] border border-[var(--erp-border)] rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={activePage === 1}
                  onClick={() => onPageChange?.(activePage - 1)}
                >
                  ←
                </button>
                <span className="px-2 py-1 text-[12px] font-medium text-[var(--erp-text)]">
                  {activePage} / {totalPages || 1}
                </span>
                <button
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-[13px] border border-[var(--erp-border)] rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={activePage >= totalPages}
                  onClick={() => onPageChange?.(activePage + 1)}
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table with horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 border-b-2 border-[var(--erp-border)]">
            <tr className="text-[var(--erp-text-muted)]">
              {columns.map((col, idx) => {
                const isSortable = onSort && col.sortable !== false;
                return (
                  <th
                    key={String(col.key) + idx}
                    className={`px-3 py-2 font-bold uppercase text-[13px] tracking-widest whitespace-nowrap ${
                      isSortable ? 'cursor-pointer select-none hover:bg-slate-200 transition-colors' : ''
                    } ${col.headerClassName || ''}`}
                    style={{
                      width: col.width,
                      textAlign: col.align || 'left',
                    }}
                    onClick={() => isSortable && handleHeaderClick(col)}
                  >
                    <span className="inline-flex items-center">
                      {col.header}
                      {renderSortIndicator(col)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              renderLoadingSkeleton()
            ) : data.length === 0 ? (
              renderEmptyState()
            ) : (
              data.map((row, rowIndex) => {
                const rowKey = row[keyField];
                const isSelected = selectedRowKey !== undefined && rowKey === selectedRowKey;
                return (
                  <tr
                    key={String(rowKey)}
                    className={`hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col, colIdx) => {
                      const value = getNestedValue(row, String(col.key));
                      return (
                        <td
                          key={String(col.key) + colIdx}
                          className={`px-3 py-2 ${col.cellClassName || ''}`}
                          style={{ textAlign: col.align || 'left' }}
                        >
                          {col.render
                            ? col.render(value as T[keyof T], row, rowIndex)
                            : String(value ?? '')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
          {footer && (
            <tfoot className="bg-slate-50 font-bold border-t-2 border-[var(--erp-border)]">
              {footer}
            </tfoot>
          )}
        </table>
      </div>

      {/* Bottom pagination bar (for tables that don't use top pagination) */}
      {showPaginationBar && activeTotal > 0 && (
        <div className="px-3 sm:px-5 py-2 bg-slate-50 border-t border-[var(--erp-border)] flex flex-wrap justify-between items-center gap-2">
          <span className="text-[12px] text-[var(--erp-text-muted)]">
            {activeTotal} total record{activeTotal !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="px-3 py-1 bg-white hover:bg-slate-100 text-[13px] border border-[var(--erp-border)] rounded disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={activePage === 1}
              onClick={() => onPageChange?.(activePage - 1)}
            >
              Prev
            </button>
            <button
              className="px-3 py-1 bg-white hover:bg-slate-100 text-[13px] border border-[var(--erp-border)] rounded disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={activePage >= totalPages}
              onClick={() => onPageChange?.(activePage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
