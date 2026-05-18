import React, { useCallback, useEffect, useState } from 'react';
import PageLayout from '../components/common/PageLayout';
import { Modal } from '../components/common/Modals';
import { apiRequest } from '../services/api';

/* ───── Types ───── */

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  parent_id: string | null;
  is_system: boolean;
  is_active: boolean;
  description: string | null;
  children?: ChartAccount[];
}

interface JournalEntryRow {
  id: string;
  entry_number: string;
  date: string;
  description: string;
  debit_account: { id: string; code: string; name: string };
  credit_account: { id: string; code: string; name: string };
  amount: number;
  reference_type: string | null;
  is_auto: boolean;
  created_at: string;
}

interface TrialBalanceRow {
  code: string;
  name: string;
  type: string;
  debitBalance: number;
  creditBalance: number;
}

interface PnLRow { name: string; code: string; amount: number; }

interface BalanceSheetRow { name: string; code: string; amount: number; }

/* ───── Helpers ───── */

const formatMoney = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val || 0);

const todayStr = () => new Date().toISOString().slice(0, 10);
const yearStartStr = () => `${new Date().getFullYear()}-01-01`;

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

const typeBadge = (type: string) => {
  const colors: Record<string, string> = {
    ASSET: 'bg-blue-100 text-blue-700 border-blue-200',
    LIABILITY: 'bg-amber-100 text-amber-700 border-amber-200',
    EQUITY: 'bg-purple-100 text-purple-700 border-purple-200',
    REVENUE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    EXPENSE: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-bold ${colors[type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {type}
    </span>
  );
};

/* ───── Component ───── */

const Accounting: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: 'Chart of Accounts', icon: 'account_tree' },
    { label: 'Journal Entries', icon: 'menu_book' },
    { label: 'Trial Balance', icon: 'balance' },
    { label: 'Profit & Loss', icon: 'trending_up' },
    { label: 'Balance Sheet', icon: 'account_balance_wallet' },
  ];

  return (
    <PageLayout>
      <main className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-[var(--erp-text)]">
            <span className="material-symbols-outlined align-middle mr-2 text-[22px]">account_balance</span>
            Accounting
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[var(--erp-border)]">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === i
                  ? 'border-[var(--erp-accent)] text-[var(--erp-accent)]'
                  : 'border-transparent text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 0 && <ChartOfAccountsTab />}
        {activeTab === 1 && <JournalEntriesTab />}
        {activeTab === 2 && <TrialBalanceTab />}
        {activeTab === 3 && <ProfitAndLossTab />}
        {activeTab === 4 && <BalanceSheetTab />}
      </main>
    </PageLayout>
  );
};

/* ═══════════════════════════════════════════════════════
   Tab 1 — Chart of Accounts
   ═══════════════════════════════════════════════════════ */

const ChartOfAccountsTab: React.FC = () => {
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [allAccounts, setAllAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'ASSET', parentId: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const [roots, all] = await Promise.all([
        apiRequest<ChartAccount[]>('/accounting/chart-of-accounts'),
        apiRequest<ChartAccount[]>('/accounting/chart-of-accounts/all'),
      ]);
      setAccounts(Array.isArray(roots) ? roots : []);
      setAllAccounts(Array.isArray(all) ? all : []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await apiRequest('/accounting/chart-of-accounts/seed', { method: 'POST' });
      fetchAccounts();
    } catch (err) {
      console.error('Failed to seed accounts:', err);
    } finally {
      setSeeding(false);
    }
  };

  const handleCreate = async () => {
    if (!form.code || !form.name) return;
    setSubmitting(true);
    try {
      await apiRequest('/accounting/chart-of-accounts', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          type: form.type,
          parentId: form.parentId || undefined,
          description: form.description || undefined,
        }),
      });
      setShowModal(false);
      fetchAccounts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (acct: ChartAccount) => {
    try {
      await apiRequest(`/accounting/chart-of-accounts/${acct.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !acct.is_active }),
      });
      fetchAccounts();
    } catch (err) {
      console.error('Failed to toggle account:', err);
    }
  };

  const handleDelete = async (acct: ChartAccount) => {
    if (!window.confirm(`Delete account "${acct.name}" (${acct.code})?`)) return;
    try {
      await apiRequest(`/accounting/chart-of-accounts/${acct.id}`, { method: 'DELETE' });
      fetchAccounts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const renderRow = (acct: ChartAccount, level: number) => (
    <React.Fragment key={acct.id}>
      <tr className="border-b border-[var(--erp-border)] hover:bg-[var(--erp-surface)] transition-colors">
        <td className="py-2.5 px-3 text-[12px] font-mono font-medium" style={{ paddingLeft: `${12 + level * 24}px` }}>
          {level > 0 && <span className="text-slate-400 mr-1">└─</span>}
          {acct.code}
        </td>
        <td className="py-2.5 px-3 text-[12px]">{acct.name}</td>
        <td className="py-2.5 px-3">{typeBadge(acct.type)}</td>
        <td className="py-2.5 px-3">
          <button
            onClick={() => handleToggleActive(acct)}
            disabled={acct.is_system}
            className={`w-9 h-5 rounded-full relative transition-colors ${acct.is_active ? 'bg-emerald-500' : 'bg-slate-300'} ${acct.is_system ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${acct.is_active ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </td>
        <td className="py-2.5 px-3">
          {acct.is_system ? (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-slate-100 text-slate-500 border-slate-200">SYSTEM</span>
          ) : (
            <button
              onClick={() => handleDelete(acct)}
              className="text-[var(--erp-text-muted)] hover:text-red-600 transition-colors"
              title="Delete"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          )}
        </td>
      </tr>
      {acct.children?.map((child) => renderRow(child, level + 1))}
    </React.Fragment>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => { setForm({ code: '', name: '', type: 'ASSET', parentId: '', description: '' }); setShowModal(true); }} className="btn btn-primary btn-sm flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">add</span>Add Account
        </button>
        <button onClick={handleSeed} disabled={seeding} className="btn btn-secondary btn-sm flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
          {seeding ? 'Seeding...' : 'Seed Defaults'}
        </button>
      </div>

      <div className="bg-white border border-[var(--erp-border)] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-3xl mb-2 text-slate-300">account_tree</span>
            <p className="text-sm text-slate-400">No accounts yet. Seed defaults to get started.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold">Code</th>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold">Name</th>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold">Type</th>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold w-20">Active</th>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold w-16"></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acct) => renderRow(acct, 0))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Account Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="md">
        <div className="border-b border-[var(--erp-border)] px-5 py-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--erp-text)]">Add Account</h3>
          <button onClick={() => setShowModal(false)} className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Code *</label>
            <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. 1300" className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Account name" className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 bg-white">
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Parent Account</label>
            <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 bg-white">
              <option value="">None (root level)</option>
              {allAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 h-20 resize-none" />
          </div>
        </div>
        <div className="border-t border-[var(--erp-border)] px-5 py-3 flex justify-end gap-2 bg-slate-50">
          <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-md">Cancel</button>
          <button onClick={handleCreate} disabled={submitting || !form.code || !form.name} className="btn btn-primary btn-md disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Tab 2 — Journal Entries
   ═══════════════════════════════════════════════════════ */

const JournalEntriesTab: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [allAccounts, setAllAccounts] = useState<ChartAccount[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: todayStr(), description: '', debitAccountId: '', creditAccountId: '', amount: '', referenceType: '', referenceId: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (accountId) params.set('accountId', accountId);
      const res = await apiRequest<{ data: JournalEntryRow[]; meta: { total: number } }>(`/accounting/journal-entries?${params.toString()}`);
      setEntries(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, startDate, endDate, accountId]);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await apiRequest<ChartAccount[]>('/accounting/chart-of-accounts/all');
      setAllAccounts(Array.isArray(res) ? res : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleCreate = async () => {
    if (!form.debitAccountId || !form.creditAccountId || !form.amount) return;
    setSubmitting(true);
    try {
      await apiRequest('/accounting/journal-entries', {
        method: 'POST',
        body: JSON.stringify({
          date: form.date,
          description: form.description,
          debitAccountId: form.debitAccountId,
          creditAccountId: form.creditAccountId,
          amount: Number(form.amount),
          referenceType: form.referenceType || undefined,
          referenceId: form.referenceId || undefined,
        }),
      });
      setShowModal(false);
      fetchEntries();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create entry');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="text-[12px] border border-[var(--erp-border)] rounded py-1.5 px-2 focus:ring-1 focus:ring-[var(--erp-accent)]" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="text-[12px] border border-[var(--erp-border)] rounded py-1.5 px-2 focus:ring-1 focus:ring-[var(--erp-accent)]" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1">Account</label>
          <select value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1); }} className="text-[12px] border border-[var(--erp-border)] rounded py-1.5 px-2 bg-white focus:ring-1 focus:ring-[var(--erp-accent)]">
            <option value="">All Accounts</option>
            {allAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
        </div>
        <div className="ml-auto">
          <button onClick={() => { setForm({ date: todayStr(), description: '', debitAccountId: '', creditAccountId: '', amount: '', referenceType: '', referenceId: '' }); setShowModal(true); }} className="btn btn-primary btn-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">add</span>New Entry
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[var(--erp-border)] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading journal entries...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-3xl mb-2 text-slate-300">menu_book</span>
            <p className="text-sm text-slate-400">No journal entries found.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold">Date</th>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold">Entry #</th>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold">Description</th>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold">Debit</th>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold">Credit</th>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold text-right">Amount</th>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold">Type</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-[var(--erp-border)] hover:bg-[var(--erp-surface)] transition-colors">
                  <td className="py-2.5 px-3 text-[12px] whitespace-nowrap">{new Date(e.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                  <td className="py-2.5 px-3 text-[12px] font-mono font-medium">{e.entry_number}</td>
                  <td className="py-2.5 px-3 text-[12px] max-w-[200px] truncate">{e.description}</td>
                  <td className="py-2.5 px-3 text-[12px]">{e.debit_account?.code} — {e.debit_account?.name}</td>
                  <td className="py-2.5 px-3 text-[12px]">{e.credit_account?.code} — {e.credit_account?.name}</td>
                  <td className="py-2.5 px-3 text-[12px] font-semibold text-right">{formatMoney(Number(e.amount))}</td>
                  <td className="py-2.5 px-3">
                    {e.is_auto ? (
                      <span className="inline-block px-1.5 py-0.5 rounded border text-[9px] font-bold bg-blue-100 text-blue-700 border-blue-200">AUTO</span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 rounded border text-[9px] font-bold bg-slate-100 text-slate-600 border-slate-200">MANUAL</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-[var(--erp-text-muted)]">
          <span>Showing {entries.length} of {total} entries</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-2 py-1 border border-[var(--erp-border)] rounded disabled:opacity-40">← Prev</button>
            <span className="px-2">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-2 py-1 border border-[var(--erp-border)] rounded disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}

      {/* Create Journal Entry Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="md">
        <div className="border-b border-[var(--erp-border)] px-5 py-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--erp-text)]">New Journal Entry</h3>
          <button onClick={() => setShowModal(false)} className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Date *</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Description *</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Entry description" className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Debit Account *</label>
            <select value={form.debitAccountId} onChange={(e) => setForm({ ...form, debitAccountId: e.target.value })} className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 bg-white">
              <option value="">Select account...</option>
              {allAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Credit Account *</label>
            <select value={form.creditAccountId} onChange={(e) => setForm({ ...form, creditAccountId: e.target.value })} className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 bg-white">
              <option value="">Select account...</option>
              {allAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Amount *</label>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Reference Type</label>
            <select value={form.referenceType} onChange={(e) => setForm({ ...form, referenceType: e.target.value })} className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 bg-white">
              <option value="">None</option>
              <option value="INVOICE">Invoice</option>
              <option value="PAYMENT">Payment</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
        </div>
        <div className="border-t border-[var(--erp-border)] px-5 py-3 flex justify-end gap-2 bg-slate-50">
          <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-md">Cancel</button>
          <button onClick={handleCreate} disabled={submitting || !form.debitAccountId || !form.creditAccountId || !form.amount || !form.description} className="btn btn-primary btn-md disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Entry'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Tab 3 — Trial Balance
   ═══════════════════════════════════════════════════════ */

const TrialBalanceTab: React.FC = () => {
  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [totalDebits, setTotalDebits] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ accounts: TrialBalanceRow[]; totalDebits: number; totalCredits: number }>(`/accounting/trial-balance?asOfDate=${asOfDate}`);
      setRows(res.accounts || []);
      setTotalDebits(res.totalDebits || 0);
      setTotalCredits(res.totalCredits || 0);
    } catch (err) {
      console.error('Failed to load trial balance:', err);
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => { fetch(); }, [fetch]);

  const exportCSV = () => {
    const header = 'Account Code,Account Name,Type,Debit,Credit\n';
    const body = rows.map((r) => `${r.code},"${r.name}",${r.type},${r.debitBalance},${r.creditBalance}`).join('\n');
    const footer = `\n,,,${totalDebits},${totalCredits}`;
    const blob = new Blob([header + body + footer], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1">As of Date</label>
          <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="text-[12px] border border-[var(--erp-border)] rounded py-1.5 px-2 focus:ring-1 focus:ring-[var(--erp-accent)]" />
        </div>
        <button onClick={exportCSV} className="btn btn-secondary btn-sm flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">download</span>Export CSV
        </button>
      </div>

      <div className="bg-white border border-[var(--erp-border)] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading trial balance...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-3xl mb-2 text-slate-300">balance</span>
            <p className="text-sm text-slate-400">No data. Create journal entries first.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold">Account Code</th>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold">Account Name</th>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold text-right">Debit</th>
                <th className="py-2 px-3 text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)] font-semibold text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-b border-[var(--erp-border)] hover:bg-[var(--erp-surface)]">
                  <td className="py-2.5 px-3 text-[12px] font-mono">{r.code}</td>
                  <td className="py-2.5 px-3 text-[12px]">{r.name}</td>
                  <td className="py-2.5 px-3 text-[12px] text-right font-semibold">{r.debitBalance > 0 ? formatMoney(r.debitBalance) : '—'}</td>
                  <td className="py-2.5 px-3 text-[12px] text-right font-semibold">{r.creditBalance > 0 ? formatMoney(r.creditBalance) : '—'}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-slate-50 border-t-2 border-[var(--erp-border)]">
                <td className="py-2.5 px-3 text-[12px] font-bold" colSpan={2}>TOTALS</td>
                <td className="py-2.5 px-3 text-[12px] text-right font-bold">{formatMoney(totalDebits)}</td>
                <td className="py-2.5 px-3 text-[12px] text-right font-bold">{formatMoney(totalCredits)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {rows.length > 0 && (
        <div className={`text-[12px] font-semibold px-1 ${Math.abs(totalDebits - totalCredits) < 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>
          {Math.abs(totalDebits - totalCredits) < 0.01
            ? '✓ Trial balance is balanced.'
            : `⚠ Out of balance by ${formatMoney(Math.abs(totalDebits - totalCredits))}`}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Tab 4 — Profit & Loss
   ═══════════════════════════════════════════════════════ */

const ProfitAndLossTab: React.FC = () => {
  const [startDate, setStartDate] = useState(yearStartStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [revenue, setRevenue] = useState<PnLRow[]>([]);
  const [expenses, setExpenses] = useState<PnLRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netIncome, setNetIncome] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{
        revenue: PnLRow[]; expenses: PnLRow[];
        totalRevenue: number; totalExpenses: number; netIncome: number;
      }>(`/accounting/profit-and-loss?startDate=${startDate}&endDate=${endDate}`);
      setRevenue(res.revenue || []);
      setExpenses(res.expenses || []);
      setTotalRevenue(res.totalRevenue || 0);
      setTotalExpenses(res.totalExpenses || 0);
      setNetIncome(res.netIncome || 0);
    } catch (err) {
      console.error('Failed to load P&L:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-[12px] border border-[var(--erp-border)] rounded py-1.5 px-2 focus:ring-1 focus:ring-[var(--erp-accent)]" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-[12px] border border-[var(--erp-border)] rounded py-1.5 px-2 focus:ring-1 focus:ring-[var(--erp-accent)]" />
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[var(--erp-border)] rounded shadow-sm p-8 text-center text-slate-400 text-sm">Loading Profit & Loss...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue */}
          <div className="bg-white border border-[var(--erp-border)] rounded shadow-sm overflow-hidden">
            <div className="bg-emerald-50 px-4 py-2.5 border-b border-[var(--erp-border)]">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-emerald-700">Revenue</h3>
            </div>
            {revenue.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">No revenue data</div>
            ) : (
              <table className="w-full">
                <tbody>
                  {revenue.map((r) => (
                    <tr key={r.code} className="border-b border-[var(--erp-border)]">
                      <td className="py-2 px-4 text-[12px]">{r.name}</td>
                      <td className="py-2 px-4 text-[12px] text-right font-semibold text-emerald-700">{formatMoney(r.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50">
                    <td className="py-2 px-4 text-[12px] font-bold">Total Revenue</td>
                    <td className="py-2 px-4 text-[12px] text-right font-bold text-emerald-700">{formatMoney(totalRevenue)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Expenses */}
          <div className="bg-white border border-[var(--erp-border)] rounded shadow-sm overflow-hidden">
            <div className="bg-red-50 px-4 py-2.5 border-b border-[var(--erp-border)]">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-red-700">Expenses</h3>
            </div>
            {expenses.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">No expense data</div>
            ) : (
              <table className="w-full">
                <tbody>
                  {expenses.map((r) => (
                    <tr key={r.code} className="border-b border-[var(--erp-border)]">
                      <td className="py-2 px-4 text-[12px]">{r.name}</td>
                      <td className="py-2 px-4 text-[12px] text-right font-semibold text-red-700">{formatMoney(r.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-red-50">
                    <td className="py-2 px-4 text-[12px] font-bold">Total Expenses</td>
                    <td className="py-2 px-4 text-[12px] text-right font-bold text-red-700">{formatMoney(totalExpenses)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Net Income */}
      {!loading && (
        <div className={`bg-white border-2 rounded shadow-sm p-4 flex items-center justify-between ${netIncome >= 0 ? 'border-emerald-300' : 'border-red-300'}`}>
          <span className="text-[14px] font-bold text-[var(--erp-text)]">Net Income</span>
          <span className={`text-lg font-bold ${netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatMoney(netIncome)}
          </span>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Tab 5 — Balance Sheet
   ═══════════════════════════════════════════════════════ */

const BalanceSheetTab: React.FC = () => {
  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [assets, setAssets] = useState<BalanceSheetRow[]>([]);
  const [liabilities, setLiabilities] = useState<BalanceSheetRow[]>([]);
  const [equity, setEquity] = useState<BalanceSheetRow[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalLiabilities, setTotalLiabilities] = useState(0);
  const [totalEquity, setTotalEquity] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{
        assets: BalanceSheetRow[]; liabilities: BalanceSheetRow[]; equity: BalanceSheetRow[];
        totalAssets: number; totalLiabilities: number; totalEquity: number;
      }>(`/accounting/balance-sheet?asOfDate=${asOfDate}`);
      setAssets(res.assets || []);
      setLiabilities(res.liabilities || []);
      setEquity(res.equity || []);
      setTotalAssets(res.totalAssets || 0);
      setTotalLiabilities(res.totalLiabilities || 0);
      setTotalEquity(res.totalEquity || 0);
    } catch (err) {
      console.error('Failed to load balance sheet:', err);
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const SectionCard = ({ title, color, items, total }: { title: string; color: string; items: BalanceSheetRow[]; total: number }) => (
    <div className="bg-white border border-[var(--erp-border)] rounded shadow-sm overflow-hidden">
      <div className={`${color} px-4 py-2.5 border-b border-[var(--erp-border)]`}>
        <h3 className="text-[12px] font-bold uppercase tracking-wider">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="p-4 text-center text-sm text-slate-400">No data</div>
      ) : (
        <table className="w-full">
          <tbody>
            {items.map((r) => (
              <tr key={r.code} className="border-b border-[var(--erp-border)]">
                <td className="py-2 px-4 text-[12px]">{r.name}</td>
                <td className="py-2 px-4 text-[12px] text-right font-semibold">{formatMoney(r.amount)}</td>
              </tr>
            ))}
            <tr className={color}>
              <td className="py-2 px-4 text-[12px] font-bold">Total {title}</td>
              <td className="py-2 px-4 text-[12px] text-right font-bold">{formatMoney(total)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );

  const liabilitiesPlusEquity = Math.round((totalLiabilities + totalEquity) * 100) / 100;
  const balanced = Math.abs(totalAssets - liabilitiesPlusEquity) < 0.01;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1">As of Date</label>
          <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="text-[12px] border border-[var(--erp-border)] rounded py-1.5 px-2 focus:ring-1 focus:ring-[var(--erp-accent)]" />
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[var(--erp-border)] rounded shadow-sm p-8 text-center text-slate-400 text-sm">Loading Balance Sheet...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SectionCard title="Assets" color="bg-blue-50 text-blue-700" items={assets} total={totalAssets} />
          <SectionCard title="Liabilities" color="bg-amber-50 text-amber-700" items={liabilities} total={totalLiabilities} />
          <SectionCard title="Equity" color="bg-purple-50 text-purple-700" items={equity} total={totalEquity} />
        </div>
      )}

      {/* Balance check */}
      {!loading && (assets.length > 0 || liabilities.length > 0 || equity.length > 0) && (
        <div className={`bg-white border-2 rounded shadow-sm p-4 flex items-center justify-between ${balanced ? 'border-emerald-300' : 'border-red-300'}`}>
          <div className="flex flex-col">
            <span className="text-[12px] text-[var(--erp-text-muted)]">Assets = Liabilities + Equity</span>
            <span className="text-[14px] font-bold text-[var(--erp-text)]">
              {formatMoney(totalAssets)} = {formatMoney(totalLiabilities)} + {formatMoney(totalEquity)}
            </span>
          </div>
          <span className={`text-[12px] font-bold ${balanced ? 'text-emerald-600' : 'text-red-600'}`}>
            {balanced ? '✓ Balanced' : '⚠ Not Balanced'}
          </span>
        </div>
      )}
    </div>
  );
};

export default Accounting;
