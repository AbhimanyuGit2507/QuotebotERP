import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import { apiRequest } from '../services/api';
import { useApp } from '../context/AppContext';

type OrderStatus =
  | 'DETECTED'
  | 'MATCHED'
  | 'REVIEW_PENDING'
  | 'APPROVED'
  | 'INVOICE_GENERATED'
  | 'INVOICE_SENT'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

interface Order {
  id: string;
  display_name?: string;
  po_number?: string;
  status: OrderStatus;
  confidence?: number;
  extracted_data?: any;
  created_at: string;
  updated_at: string;
  conversation?: {
    id: string;
    client?: {
      id: string;
      name: string;
      email: string;
    };
    messages?: Array<{
      id: string;
      sender_email: string;
      body: string;
      created_at: string;
    }>;
  };
  quotation?: {
    id: string;
    number: string;
    subtotal: number;
    tax: number;
    total: number;
    items: Array<{
      id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      total: number;
    }>;
  };
  invoice?: {
    id: string;
    number: string;
    status: string;
    total: number;
    paid_amount: number;
    payments: Array<{
      id: string;
      amount: number;
      method?: string;
      created_at: string;
    }>;
  };
}

const Orders: React.FC = () => {
  const { showToast, showConfirmModal, refreshData } = useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const selectedId = useMemo(() => {
    if (!id || !orders.some((o) => o.id === id)) {
      return orders[0]?.id || null;
    }
    return id;
  }, [id, orders]);

  const selectedOrder = orders.find((o) => o.id === selectedId);

  useEffect(() => {
    if (!selectedId && id) {
      navigate('/orders', { replace: true });
    } else if (selectedId && id !== selectedId) {
      navigate(`/orders/${selectedId}`, { replace: true });
    }
  }, [id, selectedId, navigate]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiRequest<Order[]>('/orders');
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const client = order.conversation?.client;
      const matchesSearch =
        (order.po_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const handleSelectOrder = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const handleGenerateInvoice = async () => {
    if (!selectedOrder) return;

    showConfirmModal(
      'Generate Invoice',
      `Generate invoice for PO ${selectedOrder.po_number || selectedOrder.id}?`,
      async () => {
        try {
          setGeneratingInvoice(true);
          await apiRequest(`/orders/${selectedOrder.id}/generate-invoice`, {
            method: 'POST',
          });
          showToast('Invoice generated successfully!', 'success');
          await loadOrders();
          await refreshData();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to generate invoice';
          showToast(message, 'error');
        } finally {
          setGeneratingInvoice(false);
        }
      },
    );
  };

  const handleSendInvoice = async () => {
    if (!selectedOrder || !selectedOrder.invoice) return;

    try {
      setSendingInvoice(true);
      // First mark as sent in the order
      await apiRequest(`/orders/${selectedOrder.id}/mark-invoice-sent`, {
        method: 'POST',
      });

      // Then send the actual invoice email
      const client = selectedOrder.conversation?.client;
      if (client?.email) {
        await apiRequest(`/invoices/${selectedOrder.invoice.id}/send`, {
          method: 'POST',
          body: JSON.stringify({
            recipients: [client.email],
          }),
        });
        showToast('Invoice sent successfully!', 'success');
      } else {
        showToast('Invoice marked as sent', 'success');
      }

      await loadOrders();
      await refreshData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send invoice';
      showToast(message, 'error');
    } finally {
      setSendingInvoice(false);
    }
  };

  const handleOpenPaymentModal = () => {
    if (selectedOrder?.invoice) {
      const remaining = Number(selectedOrder.invoice.total) - Number(selectedOrder.invoice.paid_amount || 0);
      setPaymentAmount(remaining.toString());
      setShowPaymentModal(true);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrder || !paymentAmount) return;

    try {
      setConfirmingPayment(true);
      await apiRequest(`/orders/${selectedOrder.id}/confirm-payment`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(paymentAmount),
          method: paymentMethod,
        }),
      });
      showToast('Payment confirmed successfully!', 'success');
      setShowPaymentModal(false);
      setPaymentAmount('');
      await loadOrders();
      await refreshData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to confirm payment';
      showToast(message, 'error');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!selectedOrder) return;

    showConfirmModal(
      'Mark Order Completed',
      `Mark this order as completed?`,
      async () => {
        try {
          await apiRequest(`/orders/${selectedOrder.id}/mark-completed`, {
            method: 'POST',
          });
          showToast('Order marked as completed!', 'success');
          await loadOrders();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to mark as completed';
          showToast(message, 'error');
        }
      },
    );
  };

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      DETECTED: 'bg-blue-100 text-blue-700 border-blue-200',
      MATCHED: 'bg-purple-100 text-purple-700 border-purple-200',
      REVIEW_PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
      APPROVED: 'bg-green-100 text-green-700 border-green-200',
      INVOICE_GENERATED: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      INVOICE_SENT: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      PAYMENT_PENDING: 'bg-orange-100 text-orange-700 border-orange-200',
      PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      COMPLETED: 'bg-green-100 text-green-700 border-green-200',
      CANCELLED: 'bg-red-100 text-red-700 border-red-200',
      CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getStatusLabel = (status: OrderStatus) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  const buildOrderDisplayName = (order: Order) => {
    if (order.display_name) {
      return order.display_name;
    }
    const date = formatShortDate(order.created_at);
    const client = order.conversation?.client?.name || 'Unknown Client';
    const items = (order.quotation?.items || [])
      .map((item) => item.product_name)
      .filter(Boolean)
      .slice(0, 5);
    const suffix = items.length ? ` - ${items.join(', ')}` : '';
    const datePart = date ? ` - ${date}` : '';
    return `PO${datePart} - ${client}${suffix}`;
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl mb-3 animate-spin">refresh</span>
            <p className="text-sm text-slate-400">Loading orders...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Orders List */}
        <aside className="w-96 border-r border-[var(--erp-border)] flex flex-col bg-white shrink-0">
          <div className="h-12 border-b border-[var(--erp-border)] bg-slate-50 flex items-center justify-between px-3 shrink-0">
            <h2 className="text-sm font-bold text-[var(--erp-text)] uppercase tracking-wider">Orders</h2>
            <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
              {orders.length} total
            </span>
          </div>

          {/* Filters */}
          <div className="p-2 border-b border-[var(--erp-border)] space-y-2 shrink-0">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 !text-[16px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search orders..."
                className="w-full text-sm border border-[var(--erp-border)] rounded pl-7 pr-2 py-1.5 focus:ring-1 focus:ring-[var(--erp-accent)]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="w-full text-[11px] border border-[var(--erp-border)] rounded px-2 py-1 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="DETECTED">Detected</option>
              <option value="MATCHED">Matched</option>
              <option value="REVIEW_PENDING">Review Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="INVOICE_GENERATED">Invoice Generated</option>
              <option value="INVOICE_SENT">Invoice Sent</option>
              <option value="PAYMENT_PENDING">Payment Pending</option>
              <option value="PAID">Paid</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Stats Bar */}
          <div className="px-3 py-2 bg-slate-50 border-b border-[var(--erp-border)] flex gap-4 text-[11px] flex-wrap">
            <span className="text-blue-600 font-medium">
              {orders.filter((o) => ['DETECTED', 'MATCHED', 'REVIEW_PENDING'].includes(o.status)).length} New
            </span>
            <span className="text-amber-600 font-medium">
              {orders.filter((o) => o.status === 'APPROVED').length} Approved
            </span>
            <span className="text-cyan-600 font-medium">
              {orders.filter((o) => ['INVOICE_GENERATED', 'INVOICE_SENT'].includes(o.status)).length} Invoiced
            </span>
            <span className="text-green-600 font-medium">
              {orders.filter((o) => ['PAID', 'COMPLETED'].includes(o.status)).length} Paid
            </span>
          </div>

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleSelectOrder(order.id)}
                className={`p-3 border-b border-[var(--erp-border)] cursor-pointer transition-colors ${
                  selectedId === order.id
                    ? 'bg-blue-50 border-l-[3px] !border-l-[var(--erp-accent)]'
                    : 'border-l-[3px] border-l-transparent hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-[12px] font-semibold text-[var(--erp-text)]">
                    {buildOrderDisplayName(order)}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 border rounded ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--erp-text-muted)] mb-1">
                  {order.conversation?.client?.name || 'Unknown Client'}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-[var(--erp-text-muted)]">
                  {order.quotation && (
                    <span>{formatMoney(order.quotation.total)}</span>
                  )}
                  {order.confidence !== undefined && (
                    <span className="text-[10px] text-blue-600 font-medium">
                      {Math.round(order.confidence)}% match
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--erp-text-muted)] mt-1">
                  {formatDate(order.created_at)}
                </p>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-2">inventory_2</span>
                <p>No orders found</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content - Order Detail */}
        <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          {selectedOrder ? (
            <>
              {/* Order Header */}
              <div className="h-14 border-b border-[var(--erp-border)] flex items-center justify-between px-5 shrink-0 bg-slate-50">
                <div>
                  <h1 className="text-base font-bold text-[var(--erp-text)]">
                    {buildOrderDisplayName(selectedOrder)}
                  </h1>
                  <p className="text-[12px] text-[var(--erp-text-muted)]">
                    {selectedOrder.conversation?.client?.name || 'Unknown Client'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-bold px-3 py-1.5 border rounded ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                  
                  {selectedOrder.status === 'APPROVED' && !selectedOrder.invoice && (
                    <button
                      onClick={handleGenerateInvoice}
                      disabled={generatingInvoice}
                      className="btn btn-primary btn-sm"
                    >
                      {generatingInvoice ? 'Generating...' : 'Generate Invoice'}
                    </button>
                  )}

                  {selectedOrder.status === 'INVOICE_GENERATED' && selectedOrder.invoice && (
                    <button
                      onClick={handleSendInvoice}
                      disabled={sendingInvoice}
                      className="btn btn-primary btn-sm"
                    >
                      {sendingInvoice ? 'Sending...' : 'Send Invoice'}
                    </button>
                  )}

                  {['INVOICE_SENT', 'PAYMENT_PENDING'].includes(selectedOrder.status) && selectedOrder.invoice && (
                    <button
                      onClick={handleOpenPaymentModal}
                      className="btn btn-primary btn-sm"
                    >
                      <span className="material-symbols-outlined !text-[16px]">payments</span>
                      Confirm Payment
                    </button>
                  )}

                  {selectedOrder.status === 'PAID' && (
                    <button
                      onClick={handleMarkCompleted}
                      className="btn btn-primary btn-sm"
                    >
                      <span className="material-symbols-outlined !text-[16px]">check_circle</span>
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>

              {/* Order Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Client Info */}
                <div className="bg-slate-50 p-4 rounded border border-[var(--erp-border)]">
                  <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-wider mb-3">
                    Customer Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-[var(--erp-text-muted)]">Name</p>
                      <p className="text-[13px] font-semibold">
                        {selectedOrder.conversation?.client?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--erp-text-muted)]">Email</p>
                      <p className="text-[13px] font-semibold">
                        {selectedOrder.conversation?.client?.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Confidence Score */}
                {selectedOrder.confidence !== undefined && (
                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <h3 className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">
                      Match Confidence
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-blue-700">
                        {Math.round(selectedOrder.confidence)}%
                      </span>
                      <div className="flex-1 bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${selectedOrder.confidence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Quotation Items */}
                {selectedOrder.quotation && (
                  <div>
                    <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-wider mb-3">
                      Order Items (from Quotation {selectedOrder.quotation.number})
                    </h3>
                    <div className="border border-[var(--erp-border)] rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-[var(--erp-border)]">
                          <tr>
                            <th className="text-left px-3 py-2 text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Product</th>
                            <th className="text-right px-3 py-2 text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Qty</th>
                            <th className="text-right px-3 py-2 text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Price</th>
                            <th className="text-right px-3 py-2 text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.quotation.items.map((item) => (
                            <tr key={item.id} className="border-b border-[var(--erp-border)]">
                              <td className="px-3 py-2">{item.product_name}</td>
                              <td className="px-3 py-2 text-right">{item.quantity}</td>
                              <td className="px-3 py-2 text-right">{formatMoney(item.unit_price)}</td>
                              <td className="px-3 py-2 text-right font-semibold">{formatMoney(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50">
                          <tr>
                            <td colSpan={3} className="px-3 py-2 text-right font-semibold">Subtotal</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatMoney(selectedOrder.quotation.subtotal)}</td>
                          </tr>
                          {selectedOrder.quotation.tax > 0 && (
                            <tr>
                              <td colSpan={3} className="px-3 py-2 text-right">Tax</td>
                              <td className="px-3 py-2 text-right">{formatMoney(selectedOrder.quotation.tax)}</td>
                            </tr>
                          )}
                          <tr className="border-t-2 border-[var(--erp-border)]">
                            <td colSpan={3} className="px-3 py-2 text-right font-bold text-lg">Total</td>
                            <td className="px-3 py-2 text-right font-bold text-lg">{formatMoney(selectedOrder.quotation.total)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Invoice Info */}
                {selectedOrder.invoice && (
                  <div className="bg-green-50 p-4 rounded border border-green-200">
                    <h3 className="text-[11px] font-bold text-green-700 uppercase tracking-wider mb-3">
                      Invoice: {selectedOrder.invoice.number}
                    </h3>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <p className="text-[11px] text-green-700">Status</p>
                        <p className="text-[13px] font-semibold capitalize">{selectedOrder.invoice.status}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-green-700">Total</p>
                        <p className="text-[13px] font-semibold">{formatMoney(selectedOrder.invoice.total)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-green-700">Paid</p>
                        <p className="text-[13px] font-semibold">{formatMoney(selectedOrder.invoice.paid_amount || 0)}</p>
                      </div>
                    </div>

                    {selectedOrder.invoice.payments && selectedOrder.invoice.payments.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[11px] font-bold text-green-700 mb-2">Payments</p>
                        <div className="space-y-1">
                          {selectedOrder.invoice.payments.map((payment) => (
                            <div key={payment.id} className="flex justify-between text-[12px] bg-white/50 px-2 py-1 rounded">
                              <span>{formatDate(payment.created_at)} - {payment.method || 'N/A'}</span>
                              <span className="font-semibold">{formatMoney(payment.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Extracted Data */}
                {selectedOrder.extracted_data && (
                  <div>
                    <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-wider mb-3">
                      Extracted PO Data
                    </h3>
                    <div className="bg-slate-50 p-4 rounded border border-[var(--erp-border)]">
                      <pre className="text-[11px] whitespace-pre-wrap font-mono overflow-auto max-h-64">
                        {JSON.stringify(selectedOrder.extracted_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl mb-3">inventory_2</span>
                <p className="text-sm">Select an order to view details</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--erp-border)] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--erp-border)] px-4 py-3">
              <h3 className="text-sm font-bold text-[var(--erp-text)]">Confirm Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={confirmingPayment}
                className="rounded p-1 text-[var(--erp-text-muted)] hover:bg-slate-100 disabled:opacity-50"
              >
                <span className="material-symbols-outlined !text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="text-[12px] font-semibold text-[var(--erp-text-muted)] uppercase tracking-wider">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  disabled={confirmingPayment}
                  className="mt-1 w-full rounded border border-[var(--erp-border)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--erp-accent)]"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[var(--erp-text-muted)] uppercase tracking-wider">
                  Method
                </label>
                <select
                  disabled={confirmingPayment}
                  className="mt-1 w-full rounded border border-[var(--erp-border)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--erp-accent)]"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-[var(--erp-border)] px-4 py-3 gap-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={confirmingPayment}
                className="rounded border border-[var(--erp-border)] px-3 py-1.5 text-[12px] font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={confirmingPayment || !paymentAmount}
                className="btn btn-primary btn-md"
              >
                {confirmingPayment ? 'Confirming...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Orders;
