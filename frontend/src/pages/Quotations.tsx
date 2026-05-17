import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import { useApp, Quote, QuoteItem } from '../context/AppContext';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Quotations: React.FC = () => {
  const { quotes, addQuote, updateQuote, deleteQuote, showConfirmModal, showToast, refreshData, clients, products, rfqs, downloadQuotationPdf, downloadQuotationsCsv, addClient } = useApp();
  const { authFetch } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const selectedId = useMemo(() => {
    if (!id || !quotes.some((q) => q.id === id)) {
      return quotes[0]?.id || null;
    }
    return id;
  }, [id, quotes]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<Set<string>>(new Set());
  const lastSelectedIndexRef = useRef<number | null>(null);
  const [relatedPOs, setRelatedPOs] = useState<any[]>([]);
  const [relatedInvoices, setRelatedInvoices] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const rfqClientIds = useMemo(
    () => new Set(rfqs.map((rfq) => rfq.clientId).filter(Boolean)),
    [rfqs],
  );

  const rfqClients = useMemo(
    () => clients.filter((client) => rfqClientIds.has(client.id)),
    [clients, rfqClientIds],
  );

  const quoteModalClients = useMemo(() => {
    if (!editingQuote?.clientId) {
      return rfqClients;
    }

    if (rfqClients.some((client) => client.id === editingQuote.clientId)) {
      return rfqClients;
    }

    const currentClient = clients.find(
      (client) => client.id === editingQuote.clientId,
    );

    return currentClient ? [currentClient, ...rfqClients] : rfqClients;
  }, [clients, editingQuote?.clientId, rfqClients]);

  useEffect(() => {
    if (!selectedId && id) {
      navigate('/quotations', { replace: true });
    } else if (selectedId && id !== selectedId) {
      navigate(`/quotations/${selectedId}`, { replace: true });
    }
  }, [id, selectedId, navigate]);

  // Fetch related entities when quotation is selected
  useEffect(() => {
    if (selectedId) {
      fetchRelatedEntities(selectedId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const fetchRelatedEntities = async (quotationId: string) => {
    setLoadingRelated(true);
    try {
      const [posResponse, invoicesResponse] = await Promise.all([
        authFetch(`/quotations/${quotationId}/purchase-orders`),
        authFetch(`/quotations/${quotationId}/invoices`),
      ]);
      
      if (posResponse.ok) {
        const pos = await posResponse.json();
        setRelatedPOs(pos);
      }
      
      if (invoicesResponse.ok) {
        const invoices = await invoicesResponse.json();
        setRelatedInvoices(invoices);
      }
    } catch (error) {
      console.error('Error fetching related entities:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      const matchesSearch = q.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           q.client.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchQuery, statusFilter]);

  const selectedQuote = quotes.find(q => q.id === selectedId);
  const selectedQuoteCount = selectedQuoteIds.size;

  const handleToggleSelection = (
    quoteId: string,
    index: number,
    shiftKey: boolean,
  ) => {
    setSelectedQuoteIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedIndexRef.current !== null) {
        const start = Math.min(lastSelectedIndexRef.current, index);
        const end = Math.max(lastSelectedIndexRef.current, index);
        filteredQuotes.slice(start, end + 1).forEach((quote) => {
          next.add(quote.id);
        });
      } else if (next.has(quoteId)) {
        next.delete(quoteId);
      } else {
        next.add(quoteId);
      }
      return next;
    });
    lastSelectedIndexRef.current = index;
  };

  const handleRowClick = (
    event: React.MouseEvent,
    quoteId: string,
    index: number,
  ) => {
    if (event.shiftKey) {
      event.preventDefault();
      handleToggleSelection(quoteId, index, true);
      return;
    }
    setSelectedQuoteIds(new Set());
    lastSelectedIndexRef.current = index;
    handleSelectQuote(quoteId);
  };

  const handleListContainerClick = (event: React.MouseEvent) => {
    if (event.shiftKey) {
      return;
    }
    if (event.target === event.currentTarget) {
      setSelectedQuoteIds(new Set());
      lastSelectedIndexRef.current = null;
    }
  };

  const handleCheckboxClick = (
    event: React.MouseEvent,
    quoteId: string,
    index: number,
  ) => {
    event.stopPropagation();
    handleToggleSelection(quoteId, index, event.shiftKey);
  };
  const handleSelectQuote = (quoteId: string) => {
    navigate(`/quotations/${quoteId}`);
  };
  const selectedClient = clients.find((client) => client.id === selectedQuote?.clientId);

  const handleDelete = (quote: Quote) => {
    const linkedRfqForQuote = rfqs.find((rfq) => rfq.quotationId === quote.id);
    const hasLinkedRfq = Boolean(linkedRfqForQuote);
    const message = hasLinkedRfq
      ? `This quotation is linked to RFQ ${linkedRfqForQuote?.number || ''}. Deleting it will also delete the linked RFQ. Continue?`
      : `Are you sure you want to delete "${quote.number}"? This action cannot be undone.`;

    showConfirmModal(
      'Delete Quotation',
      message,
      async (choice?: boolean) => {
        try {
          await deleteQuote(quote.id, choice ? { forceDeleteLinkedRfq: true } : undefined);
          // try to record audit event; ignore failures
          try {
            await apiRequest('/audit/events', {
              method: 'POST',
              body: JSON.stringify({
                action: 'delete_quotation',
                quotation_id: quote.id,
                also_delete_linked_rfq: Boolean(choice),
                performed_by: 'frontend',
                timestamp: new Date().toISOString(),
              }),
            });
          } catch {
            // non-fatal
          }
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Failed to delete quotation', 'error');
        }
      },
      { checkboxLabel: hasLinkedRfq ? 'Also delete linked RFQ' : undefined, checkboxDefault: false },
    );
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedQuoteIds);
    if (!ids.length) {
      return;
    }

    const hasAnyLinked = ids.some((quoteId) => {
      const quote = quotes.find((q) => q.id === quoteId);
      return Boolean(quote && rfqs.some((r) => r.quotationId === quote.id));
    });

    showConfirmModal(
      'Delete Quotations',
      `Delete ${ids.length} quotation(s)? This action cannot be undone.`,
      async (choice?: boolean) => {
        try {
          for (const quoteId of ids) {
            await deleteQuote(quoteId, choice ? { forceDeleteLinkedRfq: true } : undefined);
          }
          setSelectedQuoteIds(new Set());
          showToast(`Deleted ${ids.length} quotation(s).`, 'success');

          try {
            await apiRequest('/audit/events', {
              method: 'POST',
              body: JSON.stringify({
                action: 'bulk_delete_quotations',
                quotation_ids: ids,
                also_delete_linked_rfqs: Boolean(choice),
                performed_by: 'frontend',
                timestamp: new Date().toISOString(),
              }),
            });
          } catch {
            // ignore audit failures
          }
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Failed to delete quotations', 'error');
        }
      },
      { checkboxLabel: hasAnyLinked ? 'Also delete linked RFQ(s) for selected quotations' : undefined, checkboxDefault: false },
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700 border-slate-200',
      sent: 'bg-blue-100 text-blue-700 border-blue-200',
      accepted: 'bg-green-100 text-green-700 border-green-200',
      declined: 'bg-red-100 text-red-700 border-red-200',
      expired: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return styles[status] || styles.draft;
  };

  const calculateTotal = (items: QuoteItem[]) => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  // Handle Print/PDF
  const handlePrintQuote = (quote: Quote) => {
    downloadQuotationPdf(quote.id);
  };

  // Handle Email
  const handleEmailQuote = async (quote: Quote) => {
    const recipient = clients.find((client) => client.id === quote.clientId)?.email || '';
    if (!recipient) {
      showToast('Client email is missing for this quotation.', 'warning');
      return;
    }

    try {
      setSendingQuoteId(quote.id);
      await apiRequest(`/quotations/${quote.id}/send`, {
        method: 'POST',
        body: JSON.stringify({
          to: [recipient],
        }),
      });

      await refreshData();
      showToast(`Quotation ${quote.number} queued for sending.`, 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to queue quotation email',
        'error',
      );
    } finally {
      setSendingQuoteId(null);
    }
  };

  // Handle Export to CSV
  const handleExportQuotes = () => {
    downloadQuotationsCsv({
      search: searchQuery || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    });
  };

  // Handle Duplicate Quote
  const handleDuplicateQuote = (quote: Quote) => {
    const newQuote: Quote = {
      ...quote,
      id: Date.now().toString() + Math.random(),
      number: `QT-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
    };
    addQuote(newQuote);
    navigate(`/quotations/${newQuote.id}`);
  };

  return (
    <PageLayout>
      {/* Left Panel - Quote List */}
      <aside className="w-96 bg-white border-r border-[var(--erp-border)] flex flex-col shrink-0">
        <div className="p-3 border-b border-[var(--erp-border)] space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--erp-text)] uppercase">Quotations</h2>
            <div className="flex items-center gap-2">
              {selectedQuoteCount === 0 && (
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-primary btn-sm"
                  data-action="new-quote"
                >
                  <span className="material-symbols-outlined !text-[14px]">add</span>
                  NEW QUOTE
                </button>
              )}
              {selectedQuoteCount > 0 && (
                <>
                  <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                    {selectedQuoteCount} selected
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    className="p-1 hover:bg-slate-200 rounded"
                    title="Delete selected"
                  >
                    <span className="material-symbols-outlined !text-[16px] text-[var(--erp-text-muted)]">delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 !text-[16px]">search</span>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quotes..."
              className="w-full pl-7 pr-2 py-1.5 text-[12px] border border-[var(--erp-border)] rounded focus:ring-1 focus:ring-[var(--erp-accent)]"
              data-search="quotations"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 text-[11px] border border-[var(--erp-border)] rounded px-1.5 py-1"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="expired">Expired</option>
            </select>
            <button
              onClick={handleExportQuotes}
              className="px-2 py-1 border border-[var(--erp-border)] rounded text-[11px] font-medium hover:bg-slate-50"
              title="Export to CSV"
              data-action="export-csv"
            >
              <span className="material-symbols-outlined !text-[16px]">download</span>
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-3 py-2 bg-slate-50 border-b border-[var(--erp-border)] flex gap-4 text-[11px]">
          <span className="text-slate-600 font-medium">
            {quotes.filter(q => q.status === 'draft').length} Draft
          </span>
          <span className="text-blue-600 font-medium">
            {quotes.filter(q => q.status === 'sent').length} Sent
          </span>
          <span className="text-green-600 font-medium">
            {quotes.filter(q => q.status === 'accepted').length} Accepted
          </span>
        </div>

        <div
          className="flex-1 overflow-y-auto select-none"
          onClick={handleListContainerClick}
        >
          {filteredQuotes.map((quote, index) => (
            <div 
              key={quote.id}
              onClick={(event) => handleRowClick(event, quote.id, index)}
              className={`px-3 py-3 border-b border-[var(--erp-border)] cursor-pointer transition-colors ${
                selectedId === quote.id || selectedQuoteIds.has(quote.id)
                  ? 'bg-blue-50 border-l-2 border-l-[var(--erp-accent)]'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => handleCheckboxClick(event, quote.id, index)}
                      className={`material-symbols-outlined !text-[16px] transition-colors ${
                        selectedQuoteIds.has(quote.id)
                          ? 'text-blue-600'
                          : 'text-slate-400'
                      }`}
                      aria-pressed={selectedQuoteIds.has(quote.id)}
                    >
                      {selectedQuoteIds.has(quote.id) ? 'check_box' : 'check_box_outline_blank'}
                    </button>
                    <p className="text-[12px] font-bold text-[var(--erp-accent)]">{quote.display_name || quote.number}</p>
                  </div>
                  <p className="text-[12px] font-medium text-[var(--erp-text)] truncate mt-0.5">{quote.client}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getStatusBadge(quote.status)}`}>
                  {quote.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--erp-text-muted)]">
                <span>{quote.items.length} items</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">₹{calculateTotal(quote.items).toLocaleString()}</span>
                  <span>{quote.date}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredQuotes.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">
              <span className="material-symbols-outlined text-3xl mb-2">receipt_long</span>
              <p>No quotations found</p>
            </div>
          )}
        </div>
        <div className="p-2 border-t border-[var(--erp-border)] bg-slate-50 text-[11px] text-[var(--erp-text-muted)]">
          Showing {filteredQuotes.length} of {quotes.length} quotes
        </div>
      </aside>

      {/* Main Content - Quote Details */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {selectedQuote ? (
          <>
            <div className="h-14 border-b border-[var(--erp-border)] flex items-center justify-between px-5 shrink-0 bg-slate-50">
              <div className="flex items-center gap-4">
                <h1 className="text-lg font-bold text-[var(--erp-accent)]">{selectedQuote.display_name || selectedQuote.number}</h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(selectedQuote.status)}`}>
                  {selectedQuote.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handlePrintQuote(selectedQuote)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[var(--erp-border)] bg-white rounded text-[12px] font-medium hover:bg-slate-50"
                  data-action="print"
                >
                  <span className="material-symbols-outlined !text-[16px]">print</span> Print
                </button>
                <button
                  onClick={() => {
                    void handleEmailQuote(selectedQuote);
                  }}
                  disabled={!selectedClient?.email || sendingQuoteId === selectedQuote.id}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[var(--erp-border)] bg-white rounded text-[12px] font-medium hover:bg-slate-50"
                  data-action="email"
                >
                  <span className="material-symbols-outlined !text-[16px]">mail</span> Email
                </button>
                <button 
                  onClick={() => handleDuplicateQuote(selectedQuote)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[var(--erp-border)] bg-white rounded text-[12px] font-medium hover:bg-slate-50"
                  data-action="duplicate"
                  title="Duplicate quote"
                >
                  <span className="material-symbols-outlined !text-[16px]">content_copy</span> Duplicate
                </button>
                <button 
                  onClick={() => setEditingQuote(selectedQuote)}
                  className="btn btn-primary btn-sm"
                >
                  <span className="material-symbols-outlined !text-[16px]">edit</span> Edit
                </button>
                <button 
                  onClick={() => handleDelete(selectedQuote)}
                  className="flex items-center gap-1 px-2 py-1.5 text-red-600 hover:bg-red-50 rounded"
                >
                  <span className="material-symbols-outlined !text-[18px]">delete</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {/* Quote Info Grid */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1">Customer Details</h3>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex">
                      <span className="w-28 text-[var(--erp-text-muted)]">Customer:</span>
                      <span className="font-bold text-[var(--erp-accent)]">{selectedQuote.client}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-[var(--erp-text-muted)]">Address:</span>
                      <span className="text-[var(--erp-text)]">123 Business Street, City</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-[var(--erp-text-muted)]">Contact:</span>
                      <span className="text-[var(--erp-text)]">contact@{selectedQuote.client.toLowerCase().replace(/\s/g, '')}.com</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1">Quote Details</h3>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex">
                      <span className="w-28 text-[var(--erp-text-muted)]">Quote Date:</span>
                      <span className="font-semibold">{selectedQuote.date}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-[var(--erp-text-muted)]">Valid Until:</span>
                      <span className="font-semibold text-amber-600">{selectedQuote.validUntil}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-[var(--erp-text-muted)]">Currency:</span>
                      <span>INR - Indian Rupee</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="mb-6">
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">Line Items</h3>
                <div className="overflow-hidden rounded border border-[var(--erp-border)]">
                  <table className="w-full text-[13px]">
                    <thead className="bg-slate-100 text-[var(--erp-text-muted)] font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="px-3 py-2 text-center w-10">#</th>
                        <th className="px-3 py-2 text-left">Item & Description</th>
                        <th className="px-3 py-2 text-right w-20">Qty</th>
                        <th className="px-3 py-2 text-left w-16">Unit</th>
                        <th className="px-3 py-2 text-left w-32">Status</th>
                        <th className="px-3 py-2 text-right w-24">Rate</th>
                        <th className="px-3 py-2 text-right w-24">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedQuote.items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-center text-[var(--erp-text-muted)]">{index + 1}</td>
                          <td className="px-3 py-2">
                            <p className="font-medium text-[var(--erp-text)]">{item.name}</p>
                            {item.description && <p className="text-[11px] text-[var(--erp-text-muted)]">{item.description}</p>}
                          </td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-[var(--erp-text-muted)]">{item.unit}</td>
                          <td className="px-3 py-2 text-[var(--erp-text-muted)]">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                              item.availability === 'insufficient_stock'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : item.availability === 'out_of_stock'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {(item.availability || 'available').replace('_', ' ').toUpperCase()}
                            </span>
                            {typeof item.availableQuantity === 'number' ? (
                              <div className="mt-1 text-[11px] text-[var(--erp-text-muted)]">
                                Available: {item.availableQuantity}
                              </div>
                            ) : null}
                            {item.notes ? (
                              <div className="mt-1 text-[11px] text-[var(--erp-text-muted)]">{item.notes}</div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right">₹{item.rate.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-medium">₹{item.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold">
                      <tr className="border-t border-[var(--erp-border)]">
                        <td colSpan={6} className="px-3 py-2 text-right text-[var(--erp-text-muted)]">Subtotal:</td>
                        <td className="px-3 py-2 text-right">₹{calculateTotal(selectedQuote.items).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td colSpan={6} className="px-3 py-2 text-right text-[var(--erp-text-muted)]">Tax (18% GST):</td>
                        <td className="px-3 py-2 text-right">₹{Math.round(calculateTotal(selectedQuote.items) * 0.18).toLocaleString()}</td>
                      </tr>
                      <tr className="text-lg border-t border-[var(--erp-border)]">
                        <td colSpan={6} className="px-3 py-2 text-right text-[var(--erp-accent)]">Grand Total:</td>
                        <td className="px-3 py-2 text-right text-[var(--erp-accent)]">₹{Math.round(calculateTotal(selectedQuote.items) * 1.18).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Status Actions */}
              <div className="mb-6">
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">Update Status</h3>
                <div className="flex gap-2">
                  {['draft', 'sent', 'accepted', 'declined'].map(status => (
                    <button
                      key={status}
                      onClick={() => updateQuote(selectedQuote.id, { status: status as Quote['status'] })}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded border transition-colors ${
                        selectedQuote.status === status 
                          ? 'bg-[var(--erp-accent)] text-white border-[var(--erp-accent)]' 
                          : 'border-[var(--erp-border)] hover:bg-slate-50'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedQuote.notes && (
                <div className="mb-6">
                  <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">Notes</h3>
                  <p className="text-[13px] text-[var(--erp-text)]">{selectedQuote.notes}</p>
                </div>
              )}

              {/* Sent Email Details */}
              {(selectedQuote as any).sent_email_subject && (
                <div className="mb-6">
                  <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">
                    Sent Email Details
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Subject:</label>
                      <p className="text-[13px] text-slate-800 mt-1">{(selectedQuote as any).sent_email_subject}</p>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Sent At:</label>
                      <p className="text-[13px] text-slate-800 mt-1">
                        {(selectedQuote as any).sent_at ? new Date((selectedQuote as any).sent_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Email Body:</label>
                      <div className="mt-2 bg-white border border-slate-200 rounded p-3 text-[12px] text-slate-700 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                        {(selectedQuote as any).sent_email_body || 'No email body available'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Related Entities */}
              <div className="mb-6">
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">
                  Related Orders & Invoices
                </h3>
                <div className="grid grid-cols-2 gap-4">
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
                            className="block bg-white border border-slate-200 rounded p-2 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-medium text-blue-600">
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

                  {/* Invoices */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-[12px] font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined !text-[16px]">receipt</span>
                      Invoices
                    </h4>
                    {loadingRelated ? (
                      <p className="text-[11px] text-slate-500">Loading...</p>
                    ) : relatedInvoices.length > 0 ? (
                      <div className="space-y-2">
                        {relatedInvoices.map((invoice) => (
                          <Link
                            key={invoice.id}
                            to={`/invoices/${invoice.id}`}
                            className="block bg-white border border-slate-200 rounded p-2 hover:border-green-400 hover:bg-green-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-medium text-green-600">
                                {invoice.number}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                                invoice.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {invoice.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Total: ₹{Number(invoice.total || 0).toLocaleString()}
                            </p>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">No invoices yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">Quick Actions</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      void handleEmailQuote(selectedQuote);
                    }}
                    disabled={sendingQuoteId === selectedQuote.id}
                    className="btn btn-primary btn-md"
                  >
                    <span className="material-symbols-outlined !text-[16px]">send</span>
                    {sendingQuoteId === selectedQuote.id ? 'Sending...' : 'Send Quote'}
                  </button>
                  <button
                    onClick={() => handleDuplicateQuote(selectedQuote)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-[var(--erp-border)] text-[12px] font-medium rounded hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined !text-[16px]">content_copy</span>
                    Duplicate
                  </button>
                  <button onClick={() => downloadQuotationPdf(selectedQuote.id)} className="flex items-center gap-1.5 px-3 py-2 border border-[var(--erp-border)] text-[12px] font-medium rounded hover:bg-slate-50">
                    <span className="material-symbols-outlined !text-[16px]">download</span>
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl mb-3">receipt_long</span>
              <p className="text-sm">Select a quotation to view details</p>
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {(showAddModal || editingQuote) && (
        <QuoteModal
          quote={editingQuote}
          clients={quoteModalClients}
          products={products}
          addClient={addClient}
          onClose={() => { setShowAddModal(false); setEditingQuote(null); }}
          onSave={(data) => {
            if (editingQuote) {
              updateQuote(editingQuote.id, data);
            } else {
              const newNumber = `QT/25-26/${(3000 + quotes.length + 1).toString()}`;
              addQuote({ ...data, number: newNumber, date: new Date().toISOString().split('T')[0] } as Omit<Quote, 'id'>);
            }
            setShowAddModal(false);
            setEditingQuote(null);
          }}
        />
      )}
    </PageLayout>
  );
};

// Quote Modal Component
interface QuoteModalProps {
  quote: Quote | null;
  clients: { id: string; name: string }[];
  products: { id: string; name: string; basePrice: number; unit: string }[];
  addClient: (client: Omit<import('../context/AppContext').Client, 'id'>) => Promise<import('../context/AppContext').Client | void>;
  onClose: () => void;
  onSave: (data: Partial<Quote>) => void;
}

const QuoteModal: React.FC<QuoteModalProps> = ({ quote, clients, products, addClient, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    client: quote?.client || '',
    clientId: quote?.clientId || '',
    status: quote?.status || 'draft',
    validUntil: quote?.validUntil || '',
    notes: quote?.notes || '',
  });

  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [newClientData, setNewClientData] = useState({
    name: quote?.client || '',
    type: 'company' as 'company' | 'individual',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    gst: '',
    pan: '',
    tier: 'new' as 'new' | 'regular' | 'top',
  });

  const [items, setItems] = useState<QuoteItem[]>(quote?.items || [{
    id: '1', name: '', description: '', quantity: 1, unit: 'Pcs', rate: 0, total: 0
  }]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', description: '', quantity: 1, unit: 'Pcs', rate: 0, total: 0 }]);
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'rate') {
      updated[index].total = updated[index].quantity * updated[index].rate;
    }
    setItems(updated);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    let resolvedClientId = formData.clientId;
    let resolvedClientName = formData.client;

    if (clientMode === 'new' && !formData.clientId) {
      const createdClient = await handleCreateInlineClient();
      if (!createdClient) {
        return;
      }

      resolvedClientId = createdClient.id;
      resolvedClientName = createdClient.name;
    }

    if (!resolvedClientName || items.length === 0) return;
    onSave({
      ...formData,
      clientId: resolvedClientId,
      client: resolvedClientName,
      items,
    } as Partial<Quote>);
  };

  const handleClientChange = async (value: string) => {
    if (value === '__add_new__') {
      setClientMode('new');
      setFormData((prev) => ({ ...prev, clientId: '', client: newClientData.name || prev.client }));
      return;
    }

    setClientMode('existing');
    const client = clients.find((item) => item.id === value);
    setFormData({ ...formData, clientId: value, client: client?.name || '' });
  };

  const handleCreateInlineClient = async () => {
    if (!newClientData.name.trim() || !newClientData.email.trim()) {
      return null;
    }

    const createdClient = await addClient({
      name: newClientData.name.trim(),
      type: newClientData.type,
      email: newClientData.email.trim(),
      phone: newClientData.phone.trim(),
      website: newClientData.website.trim(),
      address: newClientData.address.trim(),
      city: newClientData.city.trim(),
      state: newClientData.state.trim(),
      gst: newClientData.gst.trim(),
      pan: newClientData.pan.trim(),
      tier: newClientData.tier,
      totalOrders: 0,
      totalValue: 0,
      createdAt: new Date().toISOString().split('T')[0],
    } as import('../context/AppContext').Client);

    if (createdClient && 'id' in createdClient) {
      setFormData((prev) => ({
        ...prev,
        clientId: createdClient.id,
        client: createdClient.name,
      }));
      setClientMode('existing');
      return createdClient;
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className={`relative bg-white rounded-lg shadow-xl w-full mx-4 overflow-hidden ${clientMode === 'new' ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--erp-border)] bg-slate-50">
          <h3 className="text-lg font-bold text-[var(--erp-text)]">{quote ? 'Edit Quotation' : 'Create New Quotation'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className={`grid gap-4 ${clientMode === 'new' ? 'grid-cols-2' : 'grid-cols-2'}`}>
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Client *</label>
              <div className="flex items-center gap-2">
                <select
                value={formData.clientId}
                onChange={(e) => { void handleClientChange(e.target.value); }}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2 bg-white"
              >
                <option value="">Select client...</option>
                {clients.length === 0 && (
                  <option value="" disabled>
                    No RFQ-linked clients available
                  </option>
                )}
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__add_new__">+ Add client</option>
              </select>
                <button
                  type="button"
                  onClick={() => { setClientMode('new'); setFormData((prev) => ({ ...prev, clientId: '', client: newClientData.name || prev.client })); }}
                  className="text-[12px] text-[var(--erp-accent)] hover:underline"
                >
                  + Add client
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Valid Until</label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
              />
            </div>
          </div>

          {clientMode === 'new' && (
            <div className="rounded-xl border border-[var(--erp-border)] bg-slate-50 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-[13px] font-bold text-[var(--erp-text)]">Add Client Inline</h4>
                  <p className="text-[11px] text-[var(--erp-text-muted)]">Create the client now and attach it to this quotation.</p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--erp-accent)]">New client</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Company / Contact Name *</label>
                  <input
                    type="text"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                    placeholder="Acme Industries Pvt. Ltd."
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Email *</label>
                  <input
                    type="email"
                    value={newClientData.email}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                    placeholder="billing@acme.com"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newClientData.phone}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Type</label>
                  <select
                    value={newClientData.type}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, type: e.target.value as 'company' | 'individual' }))}
                    className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2 bg-white"
                  >
                    <option value="company">Company</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Tier</label>
                  <select
                    value={newClientData.tier}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, tier: e.target.value as 'new' | 'regular' | 'top' }))}
                    className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2 bg-white"
                  >
                    <option value="new">New</option>
                    <option value="regular">Regular</option>
                    <option value="top">Top</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Website</label>
                  <input
                    type="text"
                    value={newClientData.website}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, website: e.target.value }))}
                    className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                    placeholder="https://acme.com"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Address</label>
                  <input
                    type="text"
                    value={newClientData.address}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                    placeholder="Street, area, building, landmark"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">City</label>
                  <input
                    type="text"
                    value={newClientData.city}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, city: e.target.value }))}
                    className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">State</label>
                  <input
                    type="text"
                    value={newClientData.state}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, state: e.target.value }))}
                    className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={newClientData.gst}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, gst: e.target.value }))}
                    className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                    placeholder="27AABCA1234A1ZA"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">PAN</label>
                  <input
                    type="text"
                    value={newClientData.pan}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, pan: e.target.value }))}
                    className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                    placeholder="ABCDE1234F"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { void handleCreateInlineClient(); }}
                  className="btn btn-primary btn-sm"
                  disabled={!newClientData.name.trim() || !newClientData.email.trim()}
                >
                  <span className="material-symbols-outlined !text-[16px]">person_add</span>
                  Save Client
                </button>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-medium text-[var(--erp-text-muted)]">Line Items *</label>
              <button onClick={addItem} className="text-[11px] text-[var(--erp-accent)] font-medium hover:underline">+ Add Item</button>
            </div>
            <div className="border border-[var(--erp-border)] rounded overflow-hidden">
              <table className="w-full text-[12px]">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Product</th>
                    <th className="px-2 py-1.5 text-center w-16">Qty</th>
                    <th className="px-2 py-1.5 text-left w-16">Unit</th>
                    <th className="px-2 py-1.5 text-right w-24">Rate</th>
                    <th className="px-2 py-1.5 text-right w-24">Total</th>
                    <th className="px-2 py-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-2 py-1.5">
                        <select
                          value={item.name}
                          onChange={(e) => {
                            const product = products.find(p => p.name === e.target.value);
                            if (product) {
                              updateItem(index, 'name', product.name);
                              updateItem(index, 'rate', product.basePrice);
                              updateItem(index, 'unit', product.unit);
                            }
                          }}
                          className="w-full text-[12px] border border-[var(--erp-border)] rounded px-2 py-1"
                        >
                          <option value="">Select...</option>
                          {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full text-center text-[12px] border border-[var(--erp-border)] rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-[var(--erp-text-muted)]">{item.unit}</td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full text-right text-[12px] border border-[var(--erp-border)] rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium">₹{item.total.toLocaleString()}</td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600">
                          <span className="material-symbols-outlined !text-[16px]">close</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-right text-[13px] font-bold text-[var(--erp-accent)]">
              Total: ₹{items.reduce((sum, i) => sum + i.total, 0).toLocaleString()}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2 h-20 resize-none"
              placeholder="Terms, conditions, delivery notes..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--erp-border)] bg-slate-50">
          <button onClick={onClose} className="btn btn-ghost btn-md">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary btn-md">
            {quote ? 'Update Quote' : 'Create Quote'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Quotations;
