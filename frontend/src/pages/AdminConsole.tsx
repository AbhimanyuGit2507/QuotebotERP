import React, { useEffect, useMemo, useState } from 'react';
import PageLayout from '../components/common/PageLayout';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

type OverviewResponse = {
  counts: {
    users: number;
    rfqs: number;
    quotations: number;
    invoices: number;
    openInvoices: number;
    paidInvoices: number;
    partialInvoices: number;
    cancelledInvoices: number;
    clients: number;
    products: number;
    parseRuns: number;
    outboundEmails: number;
    activities: number;
    auditLogs: number;
  };
  delivery: {
    pendingOutbound: number;
    sentOutbound: number;
    failedOutbound: number;
  };
  parsing: {
    failedRuns: number;
    recentRuns: Array<{
      id: string;
      stage: string;
      status: string;
      source?: string | null;
      matched_count: number;
      unmatched_count: number;
      error_message?: string | null;
      created_at: string;
    }>;
  };
  rfqTiming?: {
    window_days: number;
    count: number;
    avg_ms: number | null;
    p50_ms: number | null;
    p95_ms: number | null;
    best_ms: number | null;
    worst_ms: number | null;
  };
};

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type AdminLogResponse = {
  activities: Array<{ id: string; action: string; entity_type: string; created_at: string; user?: { name?: string } | null }>;
  auditLogs: Array<{ id: string; action: string; entity_type: string; created_at: string; user?: { name?: string } | null }>;
  parseRuns: Array<{ id: string; stage: string; status: string; source?: string | null; error_message?: string | null; created_at: string }>;
  outboundEmails: Array<{ id: string; subject: string; status: string; last_error?: string | null; created_at: string }>;
};

type LlmStatus = {
  provider: string;
  model: string | null;
  configured: boolean;
  status: 'configured' | 'missing_key' | 'na';
  queries_today: number | 'NA';
  failed_today?: number | 'NA';
  remaining_quota: number | 'NA';
  exhausted: boolean | 'NA';
  base_url: string | 'NA';
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatDuration = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  const totalSeconds = Math.round(value / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

interface HealthData {
  uptime: number;
  processUptime: number;
  db: 'ok' | 'error';
  redis: 'ok' | 'error';
  wsConnections: number;
  memoryMb: number;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

/* ──── System Health Panel ──── */
const SystemHealthPanel: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiRequest<HealthData>('/admin/health')
      .then((d) => setHealth(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const StatusBadge = ({ ok }: { ok: boolean }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
      {ok ? 'OK' : 'Error'}
    </span>
  );

  if (loading) return <div className="text-[13px] text-[var(--erp-text-muted)]">Loading health data...</div>;
  if (!health) return <div className="text-[13px] text-red-500">Could not load health data</div>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {[
        { label: 'Database', value: <StatusBadge ok={health.db === 'ok'} /> },
        { label: 'Redis', value: <StatusBadge ok={health.redis === 'ok'} /> },
        { label: 'WebSocket Connections', value: <span className="font-bold text-[var(--palette-cerulean)]">{health.wsConnections}</span> },
        { label: 'Server Uptime', value: <span className="font-bold">{Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m</span> },
        { label: 'Process Uptime', value: <span className="font-bold">{Math.floor(health.processUptime / 3600)}h {Math.floor((health.processUptime % 3600) / 60)}m</span> },
        { label: 'Heap Memory', value: <span className="font-bold">{health.memoryMb} MB</span> },
      ].map(({ label, value }) => (
        <div key={label} className="p-4 rounded-xl border" style={{ borderColor: 'rgba(0,52,89,0.12)', background: 'rgba(0,52,89,0.02)' }}>
          <p className="text-[11px] text-[var(--erp-text-muted)] mb-1">{label}</p>
          {value}
        </div>
      ))}
    </div>
  );
};

/* ──── Queue Stats Panel ──── */
const QueueStatsPanel: React.FC = () => {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    try {
      const d = await apiRequest<QueueStats>('/admin/queue/stats');
      setStats(d);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const retryFailed = async () => {
    setRetrying(true);
    await apiRequest('/admin/queue/retry-failed', { method: 'POST' }).catch(() => {});
    await load();
    setRetrying(false);
  };

  if (loading) return <div className="text-[13px] text-[var(--erp-text-muted)]">Loading queue stats...</div>;
  if (!stats) return <div className="text-[13px] text-red-500">Could not load queue data</div>;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {[
          { label: 'Waiting', value: stats.waiting, color: 'var(--palette-cerulean)' },
          { label: 'Active', value: stats.active, color: '#10b981' },
          { label: 'Completed', value: stats.completed, color: '#6366f1' },
          { label: 'Failed', value: stats.failed, color: '#ef4444' },
          { label: 'Delayed', value: stats.delayed, color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-3 rounded-xl border text-center" style={{ borderColor: 'rgba(0,52,89,0.12)' }}>
            <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
            <p className="text-[11px] text-[var(--erp-text-muted)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      {stats.failed > 0 && (
        <button
          onClick={() => void retryFailed()}
          disabled={retrying}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-[13px] transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: '#ef4444', color: '#fff' }}
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          {retrying ? 'Retrying...' : `Retry ${stats.failed} Failed Jobs`}
        </button>
      )}
    </div>
  );
};

const AdminConsole: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [logs, setLogs] = useState<AdminLogResponse | null>(null);
  const [llms, setLlms] = useState<LlmStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'users' | 'logs' | 'llms' | 'health' | 'queue'>('overview');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [overviewResponse, usersResponse, logsResponse, llmsResponse] = await Promise.all([
          apiRequest<OverviewResponse>('/admin/overview'),
          apiRequest<AdminUserRow[]>('/admin/users'),
          apiRequest<AdminLogResponse>('/admin/logs'),
          apiRequest<LlmStatus[]>('/admin/llms'),
        ]);

        setOverview(overviewResponse);
        setUsers(usersResponse);
        setLogs(logsResponse);
        setLlms(llmsResponse);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load admin console');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user]);

  const summaryCards = useMemo(() => {
    if (!overview) return [];

    return [
      { label: 'Users', value: overview.counts.users, accent: 'from-cyan-500 to-blue-500', hint: 'Active workspace users' },
      { label: 'RFQs', value: overview.counts.rfqs, accent: 'from-blue-500 to-indigo-500', hint: 'Captured requests' },
      { label: 'Quotes', value: overview.counts.quotations, accent: 'from-sky-500 to-cyan-500', hint: 'Generated quotations' },
      { label: 'Invoices', value: overview.counts.invoices, accent: 'from-emerald-500 to-teal-500', hint: 'Total invoices' },
      { label: 'AI calls', value: overview.counts.parseRuns, accent: 'from-slate-700 to-slate-900', hint: 'Parse runs recorded' },
      { label: 'Email errors', value: overview.delivery.failedOutbound, accent: 'from-rose-500 to-red-500', hint: 'Failed outbound emails' },
      { label: 'Audit logs', value: overview.counts.auditLogs, accent: 'from-zinc-600 to-zinc-900', hint: 'Compliance trail' },
    ];
  }, [overview]);

  if (user && user.role !== 'admin') {
    return (
      <PageLayout>
        <main className="flex-1 bg-[var(--erp-bg)] text-[var(--erp-text)] flex items-center justify-center p-8">
          <div className="max-w-lg rounded-3xl border border-[var(--erp-border)] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--erp-accent)]/10 text-[var(--erp-accent)]">
              <span className="material-symbols-outlined">lock</span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-[var(--erp-text)]">Admin access required</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--erp-text-muted)]">
              This command center is restricted to internal administrators.
            </p>
          </div>
        </main>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <main className="flex-1 flex flex-col overflow-hidden bg-white text-[var(--erp-text)]">
        <div className="h-11 border-b border-[var(--erp-border)] flex items-center px-3 bg-slate-50 shrink-0 gap-0.5 overflow-x-auto justify-between">
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {([
              { id: 'overview', label: 'Overview', icon: 'dashboard' },
              { id: 'users', label: 'Users', icon: 'group' },
              { id: 'logs', label: 'Logs', icon: 'receipt_long' },
              { id: 'llms', label: 'LLM Status', icon: 'smart_toy' },
              { id: 'health', label: 'System Health', icon: 'monitor_heart' },
              { id: 'queue', label: 'Job Queue', icon: 'pending_actions' },
            ] as const).map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium rounded transition-colors whitespace-nowrap ${
                  tab === item.id
                    ? 'bg-white text-[var(--erp-accent)] shadow-sm border border-[var(--erp-border)]'
                    : 'text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] hover:bg-white/50'
                }`}
              >
                <span className="material-symbols-outlined !text-[16px]">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--erp-text-muted)] pr-3">
            <span>Last updated: just now</span>
            <button
              onClick={() => window.location.reload()}
              className="text-[var(--erp-accent)] hover:underline font-medium"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto px-4 py-5 lg:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            <section className="rounded-3xl border border-[var(--erp-border)] bg-white p-6 shadow-sm lg:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center rounded-full border border-[var(--erp-border)] bg-[var(--erp-surface)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--erp-accent)]">
                    Admin Console
                  </div>
                  <h1 className="mt-4 text-4xl font-black tracking-tight text-[var(--erp-text)] sm:text-5xl">
                    Operations Console
                  </h1>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--erp-text-muted)]">
                    Monitor users, RFQs, quotes, deliveries, and system health from a single command center.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Users', overview?.counts.users ?? '—'],
                    ['RFQs', overview?.counts.rfqs ?? '—'],
                    ['Quotes', overview?.counts.quotations ?? '—'],
                    ['Failures', overview?.delivery.failedOutbound ?? '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] px-4 py-3 text-center">
                      <div className="text-2xl font-black text-[var(--erp-text)]">{value}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-[var(--erp-text-muted)]">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

            </section>

            {loading ? (
              <section className="rounded-3xl border border-[var(--erp-border)] bg-white p-10 text-center text-[var(--erp-text-muted)]">
                Loading admin data...
              </section>
            ) : error ? (
              <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                {error}
              </section>
            ) : null}

            {!loading && !error && tab === 'overview' && overview ? (
              <section className="grid gap-4 xl:grid-cols-3">
                {summaryCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-[var(--erp-border)] bg-white p-5 shadow-sm"
                  >
                    <div className="inline-flex rounded-2xl bg-[var(--erp-accent)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--erp-accent)]">
                      {card.label}
                    </div>
                    <div className="mt-4 text-4xl font-black text-[var(--erp-text)]">{card.value}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--erp-text-muted)]">{card.hint}</p>
                  </div>
                ))}

                <div className="rounded-2xl border border-[var(--erp-border)] bg-white p-5 xl:col-span-3">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-[var(--erp-text)]">Delivery & parsing health</h2>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      System active
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-4">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--erp-text-muted)]">Pending outbound</div>
                      <div className="mt-3 text-3xl font-black text-[var(--erp-text)]">{overview.delivery.pendingOutbound}</div>
                    </div>
                    <div className="rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-4">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--erp-text-muted)]">Failed parse runs</div>
                      <div className="mt-3 text-3xl font-black text-[var(--erp-text)]">{overview.parsing.failedRuns}</div>
                    </div>
                    <div className="rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-4">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--erp-text-muted)]">Outbound sent</div>
                      <div className="mt-3 text-3xl font-black text-[var(--erp-text)]">{overview.delivery.sentOutbound}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--erp-border)] bg-white p-5 xl:col-span-3">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-[var(--erp-text)]">RFQ → quotation speed</h2>
                    <span className="rounded-full border border-[var(--erp-border)] bg-[var(--erp-surface)] px-3 py-1 text-xs font-semibold text-[var(--erp-text-muted)]">
                      Last {overview.rfqTiming?.window_days ?? 30} days
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-5">
                    {[
                      { label: 'Average', value: formatDuration(overview.rfqTiming?.avg_ms) },
                      { label: 'P50', value: formatDuration(overview.rfqTiming?.p50_ms) },
                      { label: 'P95', value: formatDuration(overview.rfqTiming?.p95_ms) },
                      { label: 'Best', value: formatDuration(overview.rfqTiming?.best_ms) },
                      { label: 'Worst', value: formatDuration(overview.rfqTiming?.worst_ms) },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-4">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--erp-text-muted)]">{metric.label}</div>
                        <div className="mt-3 text-3xl font-black text-[var(--erp-text)]">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-[var(--erp-text-muted)]">
                    Based on {overview.rfqTiming?.count ?? 0} RFQ email(s) that produced quotations in the window.
                  </p>
                </div>
              </section>
            ) : null}

            {!loading && !error && tab === 'users' ? (
              <section className="overflow-hidden rounded-2xl border border-[var(--erp-border)] bg-white shadow-sm">
                <div className="border-b border-[var(--erp-border)] px-6 py-4">
                  <h2 className="text-lg font-semibold text-[var(--erp-text)]">All users</h2>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--erp-surface)] text-[11px] uppercase tracking-[0.24em] text-[var(--erp-text-muted)]">
                      <tr>
                        <th className="px-6 py-3 text-left">Name</th>
                        <th className="px-6 py-3 text-left">Email</th>
                        <th className="px-6 py-3 text-left">Role</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--erp-border)]">
                      {users.map((item) => (
                        <tr key={item.id} className="hover:bg-[var(--erp-surface)]">
                          <td className="px-6 py-4 font-medium text-[var(--erp-text)]">{item.name}</td>
                          <td className="px-6 py-4 text-[var(--erp-text-muted)]">{item.email}</td>
                          <td className="px-6 py-4 text-[var(--erp-text-muted)]">{item.role}</td>
                          <td className="px-6 py-4">
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[var(--erp-text-muted)]">{formatDateTime(item.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {!loading && !error && tab === 'logs' && logs ? (
              <section className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-[var(--erp-border)] bg-white shadow-sm">
                  <div className="border-b border-[var(--erp-border)] px-6 py-4">
                    <h2 className="text-lg font-semibold text-[var(--erp-text)]">Recent activities</h2>
                  </div>
                  <div className="divide-y divide-[var(--erp-border)]">
                    {logs.activities.slice(0, 8).map((item) => (
                      <div key={item.id} className="px-6 py-4">
                        <div className="text-sm font-medium text-[var(--erp-text)]">{item.entity_type} {item.action}</div>
                        <div className="mt-1 text-xs text-[var(--erp-text-muted)]">{item.user?.name || 'System'} • {formatDateTime(item.created_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--erp-border)] bg-white shadow-sm">
                  <div className="border-b border-[var(--erp-border)] px-6 py-4">
                    <h2 className="text-lg font-semibold text-[var(--erp-text)]">Parsing & email logs</h2>
                  </div>
                  <div className="space-y-3 p-6">
                    {[...logs.parseRuns.slice(0, 4), ...logs.outboundEmails.slice(0, 4)].map((item, index) => (
                      <div key={('stage' in item ? item.id : item.id) + index} className="rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-4">
                        {'stage' in item ? (
                          <>
                            <div className="text-sm font-medium text-[var(--erp-text)]">Parse run • {item.stage} • {item.status}</div>
                            <div className="mt-1 text-xs text-[var(--erp-text-muted)]">
                              {item.source || 'unknown source'} • {formatDateTime(item.created_at)}
                            </div>
                            <div className="mt-2 text-xs text-[var(--erp-text-muted)]">
                              matched {('matched_count' in item ? item.matched_count : 0)} / unmatched {('unmatched_count' in item ? item.unmatched_count : 0)}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-medium text-[var(--erp-text)]">Email • {item.subject}</div>
                            <div className="mt-1 text-xs text-[var(--erp-text-muted)]">{item.status} • {formatDateTime(item.created_at)}</div>
                            {item.last_error ? <div className="mt-2 text-xs text-rose-600">{item.last_error}</div> : null}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {!loading && !error && tab === 'llms' ? (
              <section className="overflow-hidden rounded-2xl border border-[var(--erp-border)] bg-white shadow-sm">
                <div className="border-b border-[var(--erp-border)] px-6 py-4">
                  <h2 className="text-lg font-semibold text-[var(--erp-text)]">LLM providers</h2>
                </div>
                <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                  {llms.map((provider) => (
                    <div key={provider.provider} className="rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--erp-accent)]">
                            {provider.provider}
                          </div>
                          <div className="mt-2 text-2xl font-black text-[var(--erp-text)]">
                            {provider.model || 'NA'}
                          </div>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${provider.status === 'configured' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                          {provider.status}
                        </span>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl border border-[var(--erp-border)] bg-white p-3">
                          <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--erp-text-muted)]">Queries today</div>
                          <div className="mt-2 text-lg font-bold text-[var(--erp-text)]">{provider.queries_today}</div>
                        </div>
                        <div className="rounded-2xl border border-[var(--erp-border)] bg-white p-3">
                          <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--erp-text-muted)]">Failed today</div>
                          <div className="mt-2 text-lg font-bold text-[var(--erp-text)]">{provider.failed_today ?? 'NA'}</div>
                        </div>
                        <div className="rounded-2xl border border-[var(--erp-border)] bg-white p-3">
                          <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--erp-text-muted)]">Remaining</div>
                          <div className="mt-2 text-lg font-bold text-[var(--erp-text)]">{provider.remaining_quota}</div>
                        </div>
                        <div className="rounded-2xl border border-[var(--erp-border)] bg-white p-3">
                          <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--erp-text-muted)]">Base URL</div>
                          <div className="mt-2 truncate text-xs font-medium text-[var(--erp-text-muted)]">{provider.base_url}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[var(--erp-border)] px-6 py-4 text-xs text-[var(--erp-text-muted)]">
                  Queries are counted from RFQ parse runs today; provider-level quotas are unavailable and show as NA.
                </div>
              </section>
            ) : null}

            {/* System Health Tab */}
            {tab === 'health' && (
              <section className="rounded-2xl border border-[var(--erp-border)] bg-white shadow-sm overflow-hidden">
                <div className="border-b border-[var(--erp-border)] px-6 py-4">
                  <h2 className="text-lg font-semibold text-[var(--erp-text)]">System Health</h2>
                  <p className="text-[12px] text-[var(--erp-text-muted)] mt-0.5">Real-time infrastructure status</p>
                </div>
                <div className="p-6">
                  <SystemHealthPanel />
                </div>
              </section>
            )}

            {/* Queue Stats Tab */}
            {tab === 'queue' && (
              <section className="rounded-2xl border border-[var(--erp-border)] bg-white shadow-sm overflow-hidden">
                <div className="border-b border-[var(--erp-border)] px-6 py-4">
                  <h2 className="text-lg font-semibold text-[var(--erp-text)]">Job Queue</h2>
                  <p className="text-[12px] text-[var(--erp-text-muted)] mt-0.5">Bull email-sync queue statistics</p>
                </div>
                <div className="p-6">
                  <QueueStatsPanel />
                </div>
              </section>
            )}

          </div>
        </div>
        </div>
      </main>
    </PageLayout>
  );
};

export default AdminConsole;