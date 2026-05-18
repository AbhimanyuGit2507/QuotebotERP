import React, { useCallback, useEffect, useState } from 'react';
import PageLayout from '../components/common/PageLayout';
import DataTable, { DataTableColumn } from '../components/common/DataTable';
import { Modal } from '../components/common/Modals';
import { apiRequest } from '../services/api';

/* ---------- Types ---------- */

interface PaymentInvoice {
  id: string;
  number: string;
  total: number;
  quotation?: { client?: { name?: string } } | null;
  [key: string]: unknown;
}

interface PaymentRow {
  id: string;
  amount: number;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  status: string;
  created_at: string;
  invoice?: PaymentInvoice | null;
  invoice_id: string;
  [key: string]: unknown;
}

interface PaginatedResponse {
  data: PaymentRow[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface AgingData {
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
  total: number;
}

interface InvoiceOption {
  id: string;
  number: string;
  total: number;
  paid_amount: number;
  status: string;
}

/* ---------- Helpers ---------- */

const formatMoney = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val || 0);

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
];

/* ---------- Component ---------- */

const Payments: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [aging, setAging] = useState<AgingData | null>(null);
  const [agingLoading, setAgingLoading] = useState(true);

  // Record payment modal
  const [showModal, setShowModal] = useState(false);
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);
  const [form, setForm] = useState({
    invoice_id: '',
    amount: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  /* --- Fetch payments --- */
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      const res = await apiRequest<PaginatedResponse>(
        `/payments?${params.toString()}`,
      );
      setPayments(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  /* --- Fetch aging --- */
  const fetchAging = useCallback(async () => {
    setAgingLoading(true);
    try {
      const data = await apiRequest<AgingData>('/payments/aging');
      setAging(data);
    } catch (err) {
      console.error('Failed to fetch aging:', err);
    } finally {
      setAgingLoading(false);
    }
  }, []);

  /* --- Fetch invoices for dropdown --- */
  const fetchInvoices = useCallback(async () => {
    try {
      const res = await apiRequest<{ data: InvoiceOption[] } | InvoiceOption[]>(
        '/invoices?pageSize=200&status=open',
      );
      const list = Array.isArray(res) ? res : (res as { data: InvoiceOption[] }).data || [];
      setInvoiceOptions(list);
    } catch {
      setInvoiceOptions([]);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchAging();
  }, [fetchAging]);

  /* --- Open modal --- */
  const openRecordPayment = () => {
    fetchInvoices();
    setForm({
      invoice_id: '',
      amount: '',
      payment_method: 'bank_transfer',
      reference_number: '',
      notes: '',
    });
    setShowModal(true);
  };

  /* --- Submit payment --- */
  const handleSubmit = async () => {
    if (!form.invoice_id || !form.amount) return;
    setSubmitting(true);
    try {
      await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: form.invoice_id,
          amount: Number(form.amount),
          payment_method: form.payment_method,
          reference_number: form.reference_number || undefined,
          notes: form.notes || undefined,
        }),
      });
      setShowModal(false);
      fetchPayments();
      fetchAging();
    } catch (err) {
      console.error('Failed to record payment:', err);
      alert(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  /* --- Table columns --- */
  const columns: DataTableColumn<PaymentRow>[] = [
    {
      key: 'created_at',
      header: 'Date',
      width: '150px',
      render: (_, row) => (
        <span className="text-xs whitespace-nowrap">
          {new Date(row.created_at).toLocaleDateString('en-IN', {
            dateStyle: 'medium',
          })}
        </span>
      ),
    },
    {
      key: 'invoice',
      header: 'Invoice #',
      width: '150px',
      render: (_, row) => (
        <span className="text-xs font-mono font-medium">
          {row.invoice?.number || row.invoice_id}
        </span>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      width: '180px',
      sortable: false,
      render: (_, row) => (
        <span className="text-xs">
          {(row.invoice as PaymentInvoice)?.quotation?.client?.name || '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '130px',
      align: 'right',
      render: (_, row) => (
        <span className="text-xs font-semibold text-emerald-700">
          {formatMoney(Number(row.amount))}
        </span>
      ),
    },
    {
      key: 'payment_method',
      header: 'Method',
      width: '120px',
      render: (_, row) => (
        <span className="text-xs capitalize">
          {(row.payment_method || '—').replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'reference_number',
      header: 'Reference',
      width: '150px',
      render: (_, row) => (
        <span className="text-xs text-slate-500 font-mono">
          {row.reference_number || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (_, row) => {
        const s = row.status || 'completed';
        const colors: Record<string, string> = {
          completed: 'bg-emerald-100 text-emerald-700',
          pending: 'bg-amber-100 text-amber-700',
          failed: 'bg-red-100 text-red-700',
        };
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors[s] || 'bg-slate-100 text-slate-600'}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
        );
      },
    },
  ];

  /* --- Aging card --- */
  const AgingCard = ({
    label,
    value,
    color,
  }: {
    label: string;
    value: number;
    color: string;
  }) => (
    <div className="bg-white border border-[var(--erp-border)] rounded-lg p-4 flex flex-col">
      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </span>
      <span className={`text-lg font-bold mt-1 ${color}`}>
        {formatMoney(value)}
      </span>
    </div>
  );

  return (
    <PageLayout>
      <main className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-[var(--erp-text)]">
            <span className="material-symbols-outlined align-middle mr-2 text-[22px]">
              payments
            </span>
            Payments
          </h1>
          <button
            onClick={openRecordPayment}
            className="btn btn-primary btn-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Record Payment
          </button>
        </div>

        {/* Aging cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {agingLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white border border-[var(--erp-border)] rounded-lg p-4 animate-pulse"
                >
                  <div className="h-3 bg-slate-200 rounded w-20 mb-2" />
                  <div className="h-6 bg-slate-200 rounded w-28" />
                </div>
              ))}
            </>
          ) : aging ? (
            <>
              <AgingCard
                label="Current"
                value={aging.current}
                color="text-emerald-700"
              />
              <AgingCard
                label="1-30 Days"
                value={aging.days_1_30}
                color="text-amber-600"
              />
              <AgingCard
                label="31-60 Days"
                value={aging.days_31_60}
                color="text-orange-600"
              />
              <AgingCard
                label="60+ Days"
                value={(aging.days_61_90 || 0) + (aging.days_90_plus || 0)}
                color="text-red-600"
              />
            </>
          ) : null}
        </div>

        {/* Payments table */}
        <DataTable<PaymentRow>
          columns={columns}
          data={payments}
          keyField="id"
          loading={loading}
          showPagination
          page={page}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          emptyMessage="No payments recorded yet"
        />

        {/* Record Payment Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="md">
          <div className="border-b border-[var(--erp-border)] px-5 py-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--erp-text)]">
              Record Payment
            </h3>
            <button
              onClick={() => setShowModal(false)}
              className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Invoice selector */}
            <div>
              <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">
                Invoice *
              </label>
              <select
                value={form.invoice_id}
                onChange={(e) =>
                  setForm({ ...form, invoice_id: e.target.value })
                }
                className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 bg-white"
              >
                <option value="">Select invoice...</option>
                {invoiceOptions.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.number} — {formatMoney(Number(inv.total))} (Paid:{' '}
                    {formatMoney(Number(inv.paid_amount || 0))})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">
                Amount *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">
                Payment Method
              </label>
              <select
                value={form.payment_method}
                onChange={(e) =>
                  setForm({ ...form, payment_method: e.target.value })
                }
                className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 bg-white"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">
                Reference Number
              </label>
              <input
                type="text"
                value={form.reference_number}
                onChange={(e) =>
                  setForm({ ...form, reference_number: e.target.value })
                }
                placeholder="Transaction ID, cheque no., etc."
                className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes..."
                className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 h-20 resize-none"
              />
            </div>
          </div>
          <div className="border-t border-[var(--erp-border)] px-5 py-3 flex justify-end gap-2 bg-slate-50">
            <button
              onClick={() => setShowModal(false)}
              className="btn btn-ghost btn-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.invoice_id || !form.amount}
              className="btn btn-primary btn-md disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </Modal>
      </main>
    </PageLayout>
  );
};

export default Payments;
