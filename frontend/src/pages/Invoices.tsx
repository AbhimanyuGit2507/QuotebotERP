import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import { apiRequest } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

type Payment = {
  id: string;
  amount: number;
  method?: string | null;
  external_id?: string | null;
  created_at: string;
  processed_at?: string | null;
};

type Invoice = {
  id: string;
  number: string;
  display_name?: string;
  date: string;
  due_date?: string | null;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'open' | 'paid' | 'partial' | 'cancelled';
  paid_amount: number;
  quotation_id?: string | null;
  quotation?: { id: string; number?: string } | null;
  payments: Payment[];
  search_tokens?: string[];
  sent_email_subject?: string | null;
  sent_email_body?: string | null;
  sent_at?: string | null;
};

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  }).format(amount || 0);

const Invoices: React.FC = () => {
  const { showToast, companySettings, quotes, clients, addClient } = useApp();
  const { authFetch } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [paymentRef, setPaymentRef] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    quotationId: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
  });
  const [showAddClientInline, setShowAddClientInline] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    type: 'company',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    gst: '',
    pan: '',
    tier: 'new',
  });
  const [relatedQuotation, setRelatedQuotation] = useState<any>(null);
  const [relatedPOs, setRelatedPOs] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const selectedId = useMemo(() => {
    if (!id || !invoices.some((inv) => inv.id === id)) {
      return invoices[0]?.id || null;
    }
    return id;
  }, [id, invoices]);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedId);
  const quoteInvoiceIds = useMemo(() => new Set(invoices.map((invoice) => invoice.quotation_id).filter(Boolean)), [invoices]);
  const availableQuotes = useMemo(
    () => quotes.filter((quote) => !quoteInvoiceIds.has(quote.id)),
    [quoteInvoiceIds, quotes],
  );

  const selectedQuoteForCreate = useMemo(
    () => availableQuotes.find((quote) => quote.id === createForm.quotationId) || null,
    [availableQuotes, createForm.quotationId],
  );

  useEffect(() => {
    if (!selectedId && id) {
      navigate('/invoices', { replace: true });
    } else if (selectedId && id !== selectedId) {
      navigate(`/invoices/${selectedId}`, { replace: true });
    }
  }, [id, selectedId, navigate]);

  // Fetch related entities when invoice is selected
  useEffect(() => {
    if (selectedId) {
      fetchRelatedEntities(selectedId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const fetchRelatedEntities = async (invoiceId: string) => {
    setLoadingRelated(true);
    try {
      const [quotationResponse, posResponse] = await Promise.all([
        authFetch(`/invoices/${invoiceId}/quotation`),
        authFetch(`/invoices/${invoiceId}/purchase-orders`),
      ]);
      
      if (quotationResponse.ok) {
        const quotation = await quotationResponse.json();
        setRelatedQuotation(quotation);
      }
      
      if (posResponse.ok) {
        const pos = await posResponse.json();
        setRelatedPOs(pos);
      }
    } catch (error) {
      console.error('Error fetching related entities:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const loadInvoices = useCallback(async () => {
    try {
      const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const data = await apiRequest<Invoice[]>(`/invoices${query}`);
      setInvoices(data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load invoices', 'error');
    }
  }, [showToast, statusFilter]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        inv.number.toLowerCase().includes(query) ||
        (inv.quotation?.number || '').toLowerCase().includes(query)
      );
    });
  }, [invoices, searchQuery]);

  const selectedInvoiceCount = selectedInvoiceIds.size;

  const handleRowClick = (invoiceId: string) => {
    setSelectedInvoiceIds(new Set());
    navigate(`/invoices/${invoiceId}`);
  };

  const handleCreateInvoice = async () => {
    if (!createForm.quotationId) {
      showToast('Select a quotation first', 'warning');
      return;
    }

    try {
      const createdInvoice = await apiRequest<Invoice>('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          quotation_id: createForm.quotationId,
          date: createForm.date,
          due_date: createForm.dueDate || undefined,
        }),
      });

      setShowCreateModal(false);
      setCreateForm({
        quotationId: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
      });
      await loadInvoices();
      if (createdInvoice?.id) {
        navigate(`/invoices/${createdInvoice.id}`);
      }
      showToast('Invoice created successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create invoice', 'error');
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Enter a valid payment amount', 'warning');
      return;
    }

    try {
      await apiRequest(`/invoices/${selectedInvoice.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          method: paymentMethod,
          external_id: paymentRef || undefined,
        }),
      });
      setPaymentAmount('');
      setPaymentRef('');
      await loadInvoices();
      showToast('Payment recorded', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to record payment', 'error');
    }
  };

  const handleExportXero = async () => {
    if (!selectedInvoice) return;
    try {
      await apiRequest(`/integrations/accounting/xero/invoices/${selectedInvoice.id}/export`, {
        method: 'POST',
      });
      showToast('Xero export queued', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to export to Xero', 'error');
    }
  };

  const handleExportQuickBooks = async () => {
    if (!selectedInvoice) return;
    try {
      await apiRequest(`/integrations/accounting/quickbooks/invoices/${selectedInvoice.id}/export`, {
        method: 'POST',
      });
      showToast('QuickBooks export queued', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to export to QuickBooks', 'error');
    }
  };

  const selectedCreateQuoteClient = selectedQuoteForCreate
    ? clients.find((client) => client.id === selectedQuoteForCreate.clientId)
    : null;

  const invoiceStats = useMemo(() => {
    const open = invoices.filter((invoice) => invoice.status === 'open').length;
    const paid = invoices.filter((invoice) => invoice.status === 'paid').length;
    const partial = invoices.filter((invoice) => invoice.status === 'partial').length;
    const overdue = invoices.filter((invoice) => {
      if (!invoice.due_date || invoice.status === 'paid' || invoice.status === 'cancelled') {
        return false;
      }
      return new Date(invoice.due_date).getTime() < Date.now();
    }).length;
    const outstanding = invoices.reduce(
      (sum, invoice) => sum + Math.max(0, invoice.total - invoice.paid_amount),
      0,
    );

    return { open, paid, partial, overdue, outstanding };
  }, [invoices]);

  return (
    <PageLayout>
      <aside className="w-96 bg-white border-r border-[var(--erp-border)] flex flex-col shrink-0">
        <div className="p-3 border-b border-[var(--erp-border)] space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--erp-text)] uppercase">Invoices</h2>
            <div className="flex items-center gap-2">
              {selectedInvoiceCount > 0 && (
                <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                  {selectedInvoiceCount} selected
                </span>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary btn-sm"
              >
                <span className="material-symbols-outlined !text-[14px]">add</span>
                CREATE
              </button>
            </div>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 !text-[16px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoices..."
              className="w-full pl-7 pr-2 py-1.5 text-[12px] border border-[var(--erp-border)] rounded focus:ring-1 focus:ring-[var(--erp-accent)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-[11px] border border-[var(--erp-border)] rounded px-1.5 py-1"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {/* Stats Bar */}
        <div className="px-3 py-2 bg-slate-50 border-b border-[var(--erp-border)] flex gap-4 text-[11px]">
          <span className="text-slate-600 font-medium">{invoices.filter(i => i.status === 'open').length} Draft</span>
          <span className="text-blue-600 font-medium">{invoices.filter(i => i.status === 'partial').length} Sent</span>
          <span className="text-green-600 font-medium">{invoices.filter(i => i.status === 'paid').length} Accepted</span>
        </div>
        <div className="flex-1 overflow-y-auto select-none">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              onClick={() => handleRowClick(invoice.id)}
              className={`px-3 py-3 border-b border-[var(--erp-border)] cursor-pointer transition-colors ${
                selectedId === invoice.id
                  ? 'bg-blue-50 border-l-2 border-l-[var(--erp-accent)]'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-[var(--erp-accent)]">{invoice.display_name || invoice.number}</p>
                  <p className="text-[12px] font-medium text-[var(--erp-text)] truncate mt-0.5">
                    {invoice.quotation?.number ? `Quote ${invoice.quotation.number}` : 'Manual invoice'}
                  </p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                  invoice.status === 'paid'
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : invoice.status === 'partial'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : invoice.status === 'cancelled'
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}>
                  {invoice.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--erp-text-muted)]">
                <span>{invoice.date}</span>
                <span className="font-medium">
                  {formatMoney(invoice.total, invoice.currency)}
                </span>
              </div>
            </div>
          ))}
          {filteredInvoices.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">
              <span className="material-symbols-outlined text-3xl mb-2">receipt</span>
              <p>No invoices found</p>
            </div>
          )}
        </div>
        <div className="p-2 border-t border-[var(--erp-border)] bg-slate-50 text-[11px] text-[var(--erp-text-muted)]">
          Showing {filteredInvoices.length} of {invoices.length} invoices · Outstanding {formatMoney(invoiceStats.outstanding, companySettings.currency)}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {selectedInvoice ? (
          <>
            <div className="h-14 border-b border-[var(--erp-border)] flex items-center justify-between px-5 shrink-0 bg-slate-50">
              <div className="flex items-center gap-4">
                <h1 className="text-lg font-bold text-[var(--erp-accent)]">{selectedInvoice.display_name || selectedInvoice.number}</h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  selectedInvoice.status === 'paid'
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : selectedInvoice.status === 'partial'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : selectedInvoice.status === 'cancelled'
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}>
                  {selectedInvoice.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportXero}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[var(--erp-border)] bg-white rounded text-[12px] font-medium hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined !text-[16px]">cloud_upload</span> Xero
                </button>
                <button
                  onClick={handleExportQuickBooks}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[var(--erp-border)] bg-white rounded text-[12px] font-medium hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined !text-[16px]">cloud_upload</span> QuickBooks
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1">Invoice Details</h3>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex"><span className="w-32 text-[var(--erp-text-muted)]">Date:</span><span className="font-semibold">{selectedInvoice.date}</span></div>
                    <div className="flex"><span className="w-32 text-[var(--erp-text-muted)]">Due Date:</span><span className="font-semibold">{selectedInvoice.due_date || '-'}</span></div>
                    <div className="flex"><span className="w-32 text-[var(--erp-text-muted)]">Currency:</span><span className="font-semibold">{selectedInvoice.currency || companySettings.currency}</span></div>
                    <div className="flex"><span className="w-32 text-[var(--erp-text-muted)]">Quote Ref:</span><span className="font-semibold">{selectedInvoice.quotation?.number || 'Manual'}</span></div>
                    <div className="flex"><span className="w-32 text-[var(--erp-text-muted)]">Client:</span><span className="font-semibold">{selectedInvoice.quotation?.id ? (quotes.find((quote) => quote.id === selectedInvoice.quotation?.id)?.client || 'Linked quotation client') : 'Not linked'}</span></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1">Totals</h3>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex"><span className="w-32 text-[var(--erp-text-muted)]">Subtotal:</span><span className="font-semibold">{formatMoney(selectedInvoice.subtotal, selectedInvoice.currency)}</span></div>
                    <div className="flex"><span className="w-32 text-[var(--erp-text-muted)]">Tax:</span><span className="font-semibold">{formatMoney(selectedInvoice.tax, selectedInvoice.currency)}</span></div>
                    <div className="flex"><span className="w-32 text-[var(--erp-text-muted)]">Total:</span><span className="font-semibold text-[var(--erp-accent)]">{formatMoney(selectedInvoice.total, selectedInvoice.currency)}</span></div>
                    <div className="flex"><span className="w-32 text-[var(--erp-text-muted)]">Paid:</span><span className="font-semibold">{formatMoney(selectedInvoice.paid_amount, selectedInvoice.currency)}</span></div>
                    <div className="flex"><span className="w-32 text-[var(--erp-text-muted)]">Balance:</span><span className="font-semibold">{formatMoney(selectedInvoice.total - selectedInvoice.paid_amount, selectedInvoice.currency)}</span></div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">Record Payment</h3>
                <div className="grid grid-cols-4 gap-3">
                  <input
                    type="number"
                    min="0"
                    className="col-span-1 text-[12px] border border-[var(--erp-border)] rounded px-2 py-2"
                    placeholder="Amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  <select
                    className="col-span-1 text-[12px] border border-[var(--erp-border)] rounded px-2 py-2"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="stripe">Stripe</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                  <input
                    type="text"
                    className="col-span-1 text-[12px] border border-[var(--erp-border)] rounded px-2 py-2"
                    placeholder="Reference"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                  />
                  <button
                    onClick={handleRecordPayment}
                    className="btn btn-primary btn-sm"
                  >
                    Record
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">Payments</h3>
                <div className="overflow-hidden rounded border border-[var(--erp-border)]">
                  <table className="w-full text-[12px]">
                    <thead className="bg-slate-100 text-[var(--erp-text-muted)] font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Method</th>
                        <th className="px-3 py-2 text-left">Reference</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedInvoice.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-3 py-2">
                            {new Date(payment.created_at).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-3 py-2">{payment.method || '-'}</td>
                          <td className="px-3 py-2">{payment.external_id || '-'}</td>
                          <td className="px-3 py-2 text-right">
                            {formatMoney(payment.amount, selectedInvoice.currency)}
                          </td>
                        </tr>
                      ))}
                      {selectedInvoice.payments.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-[11px] text-slate-400">
                            No payments recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sent Email Details */}
              {(selectedInvoice as any).sent_email_subject && (
                <div className="mb-6">
                  <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">
                    Sent Email Details
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Subject:</label>
                      <p className="text-[13px] text-slate-800 mt-1">{(selectedInvoice as any).sent_email_subject}</p>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Sent At:</label>
                      <p className="text-[13px] text-slate-800 mt-1">
                        {(selectedInvoice as any).sent_at ? new Date((selectedInvoice as any).sent_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Email Body:</label>
                      <div className="mt-2 bg-white border border-slate-200 rounded p-3 text-[12px] text-slate-700 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                        {(selectedInvoice as any).sent_email_body || 'No email body available'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Related Entities */}
              <div>
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">
                  Related Quotation & Purchase Orders
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Quotation */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-[12px] font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined !text-[16px]">receipt_long</span>
                      Quotation
                    </h4>
                    {loadingRelated ? (
                      <p className="text-[11px] text-slate-500">Loading...</p>
                    ) : relatedQuotation ? (
                      <Link
                        to={`/quotations/${relatedQuotation.id}`}
                        className="block bg-white border border-slate-200 rounded p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[12px] font-medium text-blue-600">
                            {relatedQuotation.number}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            relatedQuotation.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            relatedQuotation.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {relatedQuotation.status?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Client: {relatedQuotation.client?.name || 'N/A'}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Items: {relatedQuotation.items?.length || 0}
                        </p>
                      </Link>
                    ) : (
                      <p className="text-[11px] text-slate-500">No quotation linked</p>
                    )}
                  </div>

                  {/* Purchase Orders */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-[12px] font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined !text-[16px]">shopping_cart</span>
                      Purchase Orders
                    </h4>
                    {loadingRelated ? (
                      <p className="text-[11px] text-slate-500">Loading...</p>
                    ) : relatedPOs.length > 0 ? (
                      <div className="space-y-2">
                        {relatedPOs.map((po) => (
                          <Link
                            key={po.id}
                            to={`/orders/${po.id}`}
                            className="block bg-white border border-slate-200 rounded p-2 hover:border-green-400 hover:bg-green-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-medium text-green-600">
                                {po.po_number || `PO-${po.id.slice(0, 8)}`}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                po.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                po.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {po.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Confidence: {po.confidence ? `${po.confidence}%` : 'N/A'}
                            </p>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">No purchase orders yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center max-w-md px-6">
              <span className="material-symbols-outlined text-5xl mb-3">receipt_long</span>
              <p className="text-sm font-medium text-[var(--erp-text)]">
                {invoices.length === 0 ? 'No invoices have been created yet.' : 'Select an invoice to view details.'}
              </p>
              <p className="text-[12px] text-[var(--erp-text-muted)] mt-2">
                Create an invoice from an accepted quotation to keep billing aligned with the quoting flow.
              </p>
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm mt-4">
                <span className="material-symbols-outlined !text-[14px]">add</span>
                Create Invoice
              </button>
            </div>
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-5xl mx-4 overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--erp-border)] bg-slate-50 px-5 py-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--erp-text)]">Create Invoice</h3>
                <p className="text-[12px] text-[var(--erp-text-muted)]">Pick a quotation and generate the billing document used by the rest of the ERP.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid gap-6 p-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Quotation *</label>
                  <select
                    value={createForm.quotationId}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, quotationId: event.target.value }))}
                    className="w-full rounded border border-[var(--erp-border)] bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select quotation...</option>
                    {availableQuotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {quote.number} · {quote.client}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-[var(--erp-text-muted)]">
                    Only quotations without an existing invoice are shown.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddClientInline((s) => !s)}
                      className="text-[12px] text-[var(--erp-accent)] hover:underline"
                    >
                      + Add client
                    </button>
                    {showAddClientInline && (
                      <div className="w-full mt-2 p-3 border border-[var(--erp-border)] rounded bg-slate-50">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Company / Contact name"
                            value={newClientData.name}
                            onChange={(e) => setNewClientData((d) => ({ ...d, name: e.target.value }))}
                            className="col-span-2 text-sm border border-[var(--erp-border)] rounded px-2 py-2"
                          />
                          <input
                            type="email"
                            placeholder="Email"
                            value={newClientData.email}
                            onChange={(e) => setNewClientData((d) => ({ ...d, email: e.target.value }))}
                            className="text-sm border border-[var(--erp-border)] rounded px-2 py-2"
                          />
                          <input
                            type="tel"
                            placeholder="Phone"
                            value={newClientData.phone}
                            onChange={(e) => setNewClientData((d) => ({ ...d, phone: e.target.value }))}
                            className="text-sm border border-[var(--erp-border)] rounded px-2 py-2"
                          />
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button type="button" onClick={() => setShowAddClientInline(false)} className="btn btn-ghost btn-sm">Cancel</button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!newClientData.name.trim() || !newClientData.email.trim()) {
                                showToast('Enter name and email', 'warning');
                                return;
                              }
                              try {
                                const created = await addClient({
                                  name: newClientData.name.trim(),
                                  type: newClientData.type as any,
                                  email: newClientData.email.trim(),
                                  phone: newClientData.phone.trim(),
                                  website: newClientData.website.trim(),
                                  address: newClientData.address.trim(),
                                  city: newClientData.city.trim(),
                                  state: newClientData.state.trim(),
                                  gst: newClientData.gst.trim(),
                                  pan: newClientData.pan.trim(),
                                  tier: newClientData.tier as any,
                                  totalOrders: 0,
                                  totalValue: 0,
                                  createdAt: new Date().toISOString().split('T')[0],
                                } as any);
                                if (created && 'id' in created) {
                                  showToast('Client created', 'success');
                                  setShowAddClientInline(false);
                                  setNewClientData({ name: '', email: '', type: 'company', phone: '', website: '', address: '', city: '', state: '', gst: '', pan: '', tier: 'new' });
                                }
                              } catch (err) {
                                showToast(err instanceof Error ? err.message : 'Failed to create client', 'error');
                              }
                            }}
                            className="btn btn-primary btn-sm"
                          >
                            Save Client
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={createForm.date}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, date: event.target.value }))}
                      className="w-full rounded border border-[var(--erp-border)] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Due Date</label>
                    <input
                      type="date"
                      value={createForm.dueDate}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                      className="w-full rounded border border-[var(--erp-border)] px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="rounded border border-[var(--erp-border)] bg-slate-50 p-4">
                  <h4 className="text-[12px] font-bold uppercase tracking-widest text-[var(--erp-text-muted)]">Billing Flow Notes</h4>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--erp-text)]">
                    <li>• Creates the invoice against the selected quotation.</li>
                    <li>• Uses company currency and quotation totals automatically.</li>
                    <li>• Prevents duplicate invoices for the same quotation.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-[var(--erp-border)] bg-white p-4 shadow-sm">
                  <h4 className="text-[12px] font-bold uppercase tracking-widest text-[var(--erp-text-muted)]">Invoice Preview</h4>
                  {selectedQuoteForCreate ? (
                    <div className="mt-3 space-y-2 text-[13px]">
                      <div className="flex justify-between gap-4"><span className="text-[var(--erp-text-muted)]">Quotation</span><span className="font-semibold text-[var(--erp-text)]">{selectedQuoteForCreate.number}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-[var(--erp-text-muted)]">Client</span><span className="font-semibold text-[var(--erp-text)]">{selectedQuoteForCreate.client}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-[var(--erp-text-muted)]">Contact</span><span className="font-semibold text-[var(--erp-text)]">{selectedCreateQuoteClient?.email || 'No email on file'}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-[var(--erp-text-muted)]">Items</span><span className="font-semibold text-[var(--erp-text)]">{selectedQuoteForCreate.items.length}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-[var(--erp-text-muted)]">Total</span><span className="font-semibold text-[var(--erp-accent)]">{formatMoney(selectedQuoteForCreate.total || 0, selectedInvoice?.currency || companySettings.currency)}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-[var(--erp-text-muted)]">Due Balance</span><span className="font-semibold text-[var(--erp-text)]">{formatMoney(selectedQuoteForCreate.total || 0, selectedInvoice?.currency || companySettings.currency)}</span></div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--erp-text-muted)]">Choose a quotation to see invoice details.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-4 text-sm text-[var(--erp-text-muted)]">
                  Extra controls can be added here later for PO number, payment terms, or dispatch notes without changing the create flow.
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--erp-border)] bg-slate-50 px-5 py-3">
              <button onClick={() => setShowCreateModal(false)} className="btn btn-ghost btn-md">
                Cancel
              </button>
              <button
                onClick={() => { void handleCreateInvoice(); }}
                className="btn btn-primary btn-md"
                disabled={!createForm.quotationId}
              >
                <span className="material-symbols-outlined !text-[16px]">description</span>
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Invoices;
