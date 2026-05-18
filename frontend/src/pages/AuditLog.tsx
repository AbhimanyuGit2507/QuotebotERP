import React, { useCallback, useEffect, useState } from 'react';
import PageLayout from '../components/common/PageLayout';
import DataTable, { DataTableColumn } from '../components/common/DataTable';
import { apiRequest } from '../services/api';

interface AuditUser {
  id: string;
  email: string;
  name?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, unknown> | null;
  user?: AuditUser | null;
  user_id?: string;
  created_at: string;
  [key: string]: unknown;
}

interface PaginatedResponse {
  data: AuditEntry[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
};

const ENTITY_TYPES = [
  'Quotation',
  'Client',
  'Product',
  'Invoice',
  'RFQ',
  'Settings',
  'User',
];

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE'];

const AuditLog: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [entityIdSearch, setEntityIdSearch] = useState('');

  // Expanded rows for viewing changes
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (entityTypeFilter) params.set('entityType', entityTypeFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await apiRequest<PaginatedResponse>(
        `/audit-logs?${params.toString()}`,
      );
      let data = res.data || [];

      // Client-side entity ID search filter
      if (entityIdSearch.trim()) {
        data = data.filter((entry) =>
          entry.entity_id
            ?.toLowerCase()
            .includes(entityIdSearch.trim().toLowerCase()),
        );
      }

      setEntries(data);
      setTotal(entityIdSearch.trim() ? data.length : res.meta?.total || 0);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, entityTypeFilter, actionFilter, dateFrom, dateTo, entityIdSearch]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [entityTypeFilter, actionFilter, dateFrom, dateTo, entityIdSearch]);

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return ts;
    }
  };

  const columns: DataTableColumn<AuditEntry>[] = [
    {
      key: 'created_at',
      header: 'Timestamp',
      width: '170px',
      render: (_, row) => (
        <span className="text-xs text-slate-600 whitespace-nowrap">
          {formatTimestamp(row.created_at)}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      width: '180px',
      render: (_, row) => (
        <span className="text-xs">
          {row.user?.name || row.user?.email || row.user_id || '—'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      width: '100px',
      render: (_, row) => {
        const color = ACTION_COLORS[row.action] || 'bg-slate-100 text-slate-700';
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}
          >
            {row.action}
          </span>
        );
      },
    },
    {
      key: 'entity_type',
      header: 'Entity Type',
      width: '130px',
      render: (_, row) => (
        <span className="text-xs font-medium">{row.entity_type}</span>
      ),
    },
    {
      key: 'entity_id',
      header: 'Entity ID',
      width: '200px',
      render: (_, row) => (
        <span className="text-xs font-mono text-slate-500 truncate block max-w-[200px]" title={row.entity_id}>
          {row.entity_id}
        </span>
      ),
    },
    {
      key: 'changes',
      header: 'Changes',
      width: '120px',
      sortable: false,
      render: (_, row) => {
        if (!row.changes || Object.keys(row.changes).length === 0) {
          return <span className="text-xs text-slate-400">—</span>;
        }
        const isExpanded = expandedRows.has(row.id);
        return (
          <div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(row.id);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
            >
              {isExpanded ? 'Hide' : 'View'}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <PageLayout>
      <main className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-[var(--erp-text)]">
            <span className="material-symbols-outlined align-middle mr-2 text-[22px]">
              assignment
            </span>
            Audit Log
          </h1>
        </div>

        {/* Filters */}
        <div className="bg-white border border-[var(--erp-border)] rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Entity Type
              </label>
              <select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="w-full text-sm border border-[var(--erp-border)] rounded py-1.5 px-2 bg-white"
              >
                <option value="">All Types</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Action
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full text-sm border border-[var(--erp-border)] rounded py-1.5 px-2 bg-white"
              >
                <option value="">All Actions</option>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full text-sm border border-[var(--erp-border)] rounded py-1.5 px-2"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full text-sm border border-[var(--erp-border)] rounded py-1.5 px-2"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Entity ID
              </label>
              <input
                type="text"
                value={entityIdSearch}
                onChange={(e) => setEntityIdSearch(e.target.value)}
                placeholder="Search by ID..."
                className="w-full text-sm border border-[var(--erp-border)] rounded py-1.5 px-2"
              />
            </div>
          </div>
          {(entityTypeFilter || actionFilter || dateFrom || dateTo || entityIdSearch) && (
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => {
                  setEntityTypeFilter('');
                  setActionFilter('');
                  setDateFrom('');
                  setDateTo('');
                  setEntityIdSearch('');
                }}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <DataTable<AuditEntry>
          columns={columns}
          data={entries}
          keyField="id"
          loading={loading}
          showPagination
          page={page}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          emptyMessage="No audit log entries found"
        />

        {/* Expanded Change Details */}
        {entries
          .filter((e) => expandedRows.has(e.id))
          .map((entry) => (
            <div
              key={`detail-${entry.id}`}
              className="bg-slate-50 border border-[var(--erp-border)] rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-700">
                  Changes — {entry.entity_type} ({entry.action}) — {formatTimestamp(entry.created_at)}
                </h4>
                <button
                  onClick={() => toggleExpand(entry.id)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-slate-900 text-slate-200 p-3 rounded max-h-60 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(entry.changes, null, 2)}
              </pre>
            </div>
          ))}
      </main>
    </PageLayout>
  );
};

export default AuditLog;
