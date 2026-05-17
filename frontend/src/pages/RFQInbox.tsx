import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import { useApp, RFQ, RFQLineItem } from '../context/AppContext';
import { apiRequest, retryInboxMessageByRfq } from '../services/api';

const RFQInbox: React.FC = () => {
  const { rfqs, quotes, addRFQ, updateRFQ, deleteRFQ, showConfirmModal, showToast, refreshData, clients, products, convertRFQToQuote, downloadRfqsCsv } = useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const selectedId = useMemo(() => {
    if (!id || !rfqs.some((r) => r.id === id)) {
      return rfqs[0]?.id || null;
    }
    return id;
  }, [id, rfqs]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRfqIds, setSelectedRfqIds] = useState<Set<string>>(new Set());
  const lastSelectedIndexRef = React.useRef<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRFQ, setEditingRFQ] = useState<RFQ | null>(null);
  const [sendingEmailType, setSendingEmailType] = useState<'reply' | 'forward' | null>(null);

  useEffect(() => {
    if (!selectedId && id) {
      navigate('/rfq-inbox', { replace: true });
    } else if (selectedId && id !== selectedId) {
      navigate(`/rfq-inbox/${selectedId}`, { replace: true });
    }
  }, [id, selectedId, navigate]);

  // Filter RFQs
  const filteredRFQs = useMemo(() => {
    return rfqs.filter(r => {
      const matchesSearch = r.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           r.client.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesChannel = channelFilter === 'all' || r.channel === channelFilter;
      return matchesSearch && matchesStatus && matchesChannel;
    });
  }, [rfqs, searchQuery, statusFilter, channelFilter]);

  const selectedRFQ = rfqs.find(r => r.id === selectedId);
  const selectedRfqCount = selectedRfqIds.size;
  const selectedClient = clients.find((client) => client.id === selectedRFQ?.clientId);
  const selectedRfqItems = selectedRFQ?.itemDetails || [];
  const linkedQuotation = quotes.find((quote) => quote.id === selectedRFQ?.quotationId);

  const handleToggleSelection = (
    rfqId: string,
    index: number,
    shiftKey: boolean,
  ) => {
    setSelectedRfqIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedIndexRef.current !== null) {
        const start = Math.min(lastSelectedIndexRef.current, index);
        const end = Math.max(lastSelectedIndexRef.current, index);
        filteredRFQs.slice(start, end + 1).forEach((rfq) => {
          next.add(rfq.id);
        });
      } else if (next.has(rfqId)) {
        next.delete(rfqId);
      } else {
        next.add(rfqId);
      }
      return next;
    });
    lastSelectedIndexRef.current = index;
  };

  const handleRowClick = (
    event: React.MouseEvent,
    rfqId: string,
    index: number,
  ) => {
    if (event.shiftKey) {
      event.preventDefault();
      handleToggleSelection(rfqId, index, true);
      return;
    }
    setSelectedRfqIds(new Set());
    lastSelectedIndexRef.current = index;
    handleSelectRfq(rfqId);
  };

  const handleListContainerClick = (event: React.MouseEvent) => {
    if (event.shiftKey) {
      return;
    }
    if (event.target === event.currentTarget) {
      setSelectedRfqIds(new Set());
      lastSelectedIndexRef.current = null;
    }
  };

  const handleCheckboxClick = (
    event: React.MouseEvent,
    rfqId: string,
    index: number,
  ) => {
    event.stopPropagation();
    handleToggleSelection(rfqId, index, event.shiftKey);
  };
  const handleSelectRfq = (rfqId: string) => {
    navigate(`/rfq-inbox/${rfqId}`);
  };

  const handleDelete = (rfq: RFQ) => {
    const rfqLinkedQuotation = quotes.find((quote) => quote.id === rfq.quotationId);
    const hasLinkedQuotation = Boolean(rfqLinkedQuotation);
    const message = hasLinkedQuotation
      ? `This RFQ is linked to a quotation${rfqLinkedQuotation?.number ? ` (${rfqLinkedQuotation.number})` : ''}. Deleting it will also delete the linked quotation. Continue?`
      : `Are you sure you want to delete "${rfq.number}"? This action cannot be undone.`;

    showConfirmModal(
      'Delete RFQ',
      message,
      (choice?: boolean) => {
        // if checkbox was checked, delete linked quotation as well
        if (choice) {
          deleteRFQ(rfq.id, { forceDeleteLinkedQuotation: true });
        } else {
          deleteRFQ(rfq.id);
        }
      },
      { checkboxLabel: hasLinkedQuotation ? 'Also delete linked quotation' : undefined, checkboxDefault: false },
    );
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedRfqIds);
    if (!ids.length) {
      return;
    }

    const hasAnyLinked = ids.some((rfqId) => {
      const rfq = rfqs.find((r) => r.id === rfqId);
      return Boolean(rfq && rfq.quotationId);
    });

    showConfirmModal(
      'Delete RFQs',
      `Delete ${ids.length} RFQ(s)? This action cannot be undone.`,
      (choice?: boolean) => {
        ids.forEach((rfqId) => deleteRFQ(rfqId, choice ? { forceDeleteLinkedQuotation: true } : undefined));
        setSelectedRfqIds(new Set());
        showToast(`Deleted ${ids.length} RFQ(s).`, 'success');
      },
      { checkboxLabel: hasAnyLinked ? 'Also delete linked quotation(s) for selected RFQs' : undefined, checkboxDefault: false },
    );
  };

  const handleConvertToQuote = (rfq: RFQ) => {
    convertRFQToQuote(rfq.id);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      draft: 'bg-blue-100 text-blue-700 border-blue-200',
      quoted: 'bg-green-100 text-green-700 border-green-200',
      expired: 'bg-red-100 text-red-700 border-red-200',
      converted: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return styles[status] || styles.pending;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return 'mail';
      case 'whatsapp': return 'chat';
      default: return 'edit_note';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      default: return 'text-slate-400';
    }
  };

  const handleExportRFQs = () => {
    downloadRfqsCsv({
      search: searchQuery || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      channel: channelFilter === 'all' ? undefined : channelFilter,
    });
  };

  const queueRfqEmail = async (
    rfq: RFQ,
    payload: {
      to?: string[];
      subject: string;
      message: string;
    },
    successMessage: string,
  ) => {
    await apiRequest(`/rfqs/${rfq.id}/send-email`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await refreshData();
    showToast(successMessage, 'success');
  };

  const handleReplyToClient = async (rfq: RFQ) => {
    const client = clients.find((item) => item.id === rfq.clientId);
    const recipient = client?.email || '';
    if (!recipient) {
      showToast('Client email is missing for this RFQ.', 'warning');
      return;
    }

    const subject = `Re: ${rfq.number} - Quotation Follow-up`;
    const body = `Dear ${rfq.client},\n\nRegarding your RFQ ${rfq.number},\nwe are preparing your quotation and will share it shortly.\n\nBest regards,\nQuotebot Sales Team`;

    try {
      setSendingEmailType('reply');
      await queueRfqEmail(
        rfq,
        {
          to: [recipient],
          subject,
          message: body,
        },
        `Reply for ${rfq.number} queued for sending.`,
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to queue reply email',
        'error',
      );
    } finally {
      setSendingEmailType(null);
    }
  };

  const handleForwardRFQ = async (rfq: RFQ) => {
    const recipientInput = window.prompt('Enter recipient email for forwarding this RFQ summary:');
    const recipient = recipientInput?.trim() || '';

    if (!recipient) {
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(recipient)) {
      showToast('Please enter a valid recipient email address.', 'warning');
      return;
    }

    const subject = `FWD: ${rfq.number} (${rfq.client})`;
    const body = `RFQ: ${rfq.number}\nClient: ${rfq.client}\nChannel: ${rfq.channel}\nPriority: ${rfq.priority}\nItems: ${rfq.items}\nValue: ${rfq.value}\nDue: ${rfq.dueDate || 'N/A'}\n\nNotes:\n${rfq.notes || '-'}`;

    try {
      setSendingEmailType('forward');
      await queueRfqEmail(
        rfq,
        {
          to: [recipient],
          subject,
          message: body,
        },
        `Forward for ${rfq.number} queued for sending.`,
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to queue forward email',
        'error',
      );
    } finally {
      setSendingEmailType(null);
    }
  };

  const handleReparseRfqSource = async (rfq: RFQ) => {
    showConfirmModal(
      'Re-parse Source Email',
      `Re-run parsing for source email linked to ${rfq.number}? This can create updated RFQ/quotation records.`,
      () => {
        void (async () => {
          try {
            await retryInboxMessageByRfq(rfq.id, {
              force_retry: true,
              reason: `Manual retry requested from RFQ page for ${rfq.number}`,
            });

            await apiRequest<{
              started?: boolean;
              reason?: string;
              status?: { status?: string };
            }>('/email-integrations/sync-now', {
              method: 'POST',
            });

            await refreshData();
            showToast('Source email re-queued. Parsing will run again shortly.', 'info');
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Could not re-parse source email for this RFQ';
            showToast(message, 'error');
          }
        })();
      },
    );
  };

  return (
    <PageLayout>
      {/* Left Panel - RFQ List */}
      <aside className="w-96 bg-white border-r border-[var(--erp-border)] flex flex-col shrink-0">
        <div className="p-3 border-b border-[var(--erp-border)] space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--erp-text)] uppercase">RFQ Management</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleExportRFQs}
                className="px-2 py-1 border border-[var(--erp-border)] bg-white text-[11px] font-medium rounded hover:bg-slate-50"
                title="Export to CSV"
                data-action="export-csv"
              >
                <span className="material-symbols-outlined !text-[14px]">download</span>
              </button>
              {selectedRfqCount === 0 && (
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-primary btn-sm"
                  data-action="new-rfq"
                >
                  <span className="material-symbols-outlined !text-[14px]">add</span>
                  NEW RFQ
                </button>
              )}
              {selectedRfqCount > 0 && (
                <>
                  <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                    {selectedRfqCount} selected
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
              placeholder="Search RFQs..."
              className="w-full pl-7 pr-2 py-1.5 text-[12px] border border-[var(--erp-border)] rounded focus:ring-1 focus:ring-[var(--erp-accent)]"
              data-search="rfqs"
            />
          </div>
          <div className="flex gap-1">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 text-[11px] border border-[var(--erp-border)] rounded px-1.5 py-1"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
              <option value="quoted">Quoted</option>
              <option value="expired">Expired</option>
              <option value="converted">Converted</option>
            </select>
            <select 
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="flex-1 text-[11px] border border-[var(--erp-border)] rounded px-1.5 py-1"
            >
              <option value="all">All Channels</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-3 py-2 bg-slate-50 border-b border-[var(--erp-border)] flex gap-4 text-[11px]">
          <span className="text-yellow-600 font-medium">
            {rfqs.filter(r => r.status === 'pending').length} Pending
          </span>
          <span className="text-blue-600 font-medium">
            {rfqs.filter(r => r.status === 'draft').length} Draft
          </span>
          <span className="text-green-600 font-medium">
            {rfqs.filter(r => r.status === 'quoted').length} Quoted
          </span>
        </div>

        <div
          className="flex-1 overflow-y-auto select-none"
          onClick={handleListContainerClick}
        >
          {filteredRFQs.map((rfq, index) => (
            <div 
              key={rfq.id}
              onClick={(event) => handleRowClick(event, rfq.id, index)}
              className={`px-3 py-3 border-b border-[var(--erp-border)] cursor-pointer transition-colors ${
                selectedId === rfq.id || selectedRfqIds.has(rfq.id)
                  ? 'bg-blue-50 border-l-2 border-l-[var(--erp-accent)]'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => handleCheckboxClick(event, rfq.id, index)}
                      className={`material-symbols-outlined !text-[16px] transition-colors ${
                        selectedRfqIds.has(rfq.id)
                          ? 'text-blue-600'
                          : 'text-slate-400'
                      }`}
                      aria-pressed={selectedRfqIds.has(rfq.id)}
                    >
                      {selectedRfqIds.has(rfq.id) ? 'check_box' : 'check_box_outline_blank'}
                    </button>
                    <span className={`material-symbols-outlined !text-[14px] ${getPriorityColor(rfq.priority)}`}>
                      {rfq.priority === 'high' ? 'priority_high' : rfq.priority === 'medium' ? 'remove' : 'arrow_downward'}
                    </span>
                    <p className="text-[12px] font-bold text-[var(--erp-accent)]">{rfq.number}</p>
                  </div>
                  <p className="text-[12px] font-medium text-[var(--erp-text)] truncate mt-0.5">{rfq.client}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getStatusBadge(rfq.status)}`}>
                  {rfq.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--erp-text-muted)]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined !text-[14px]">{getChannelIcon(rfq.channel)}</span>
                  <span>{rfq.items} items</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{rfq.value}</span>
                  <span>{rfq.date}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredRFQs.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">
              <span className="material-symbols-outlined text-3xl mb-2">assignment</span>
              <p>No RFQs found</p>
            </div>
          )}
        </div>
        <div className="p-2 border-t border-[var(--erp-border)] bg-slate-50 text-[11px] text-[var(--erp-text-muted)]">
          Showing {filteredRFQs.length} of {rfqs.length} RFQs
        </div>
      </aside>

      {/* Main Content - RFQ Details */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {selectedRFQ ? (
          <>
            <div className="h-14 border-b border-[var(--erp-border)] flex items-center justify-between px-5 shrink-0 bg-slate-50">
              <div className="flex items-center gap-4">
                <h1 className="text-lg font-bold text-[var(--erp-accent)]">{selectedRFQ.number}</h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(selectedRFQ.status)}`}>
                  {selectedRFQ.status.toUpperCase()}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPriorityColor(selectedRFQ.priority)} bg-opacity-10`}>
                  {selectedRFQ.priority.toUpperCase()} PRIORITY
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedRFQ.status === 'pending' && (
                  <button 
                    onClick={() => handleConvertToQuote(selectedRFQ)}
                    className="btn btn-primary btn-sm"
                  >
                    <span className="material-symbols-outlined !text-[16px]">add</span> Create Quote
                  </button>
                )}
                <button 
                  onClick={() => setEditingRFQ(selectedRFQ)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[var(--erp-border)] bg-white rounded text-[12px] font-medium hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined !text-[16px]">edit</span> Edit
                </button>
                <button
                  onClick={() => handleReparseRfqSource(selectedRFQ)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-amber-300 bg-amber-50 rounded text-[12px] font-medium text-amber-700 hover:bg-amber-100"
                >
                  <span className="material-symbols-outlined !text-[16px]">refresh</span> Re-parse Source
                </button>
                <button 
                  onClick={() => handleDelete(selectedRFQ)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-red-200 bg-white rounded text-[12px] font-medium text-red-600 hover:bg-red-50"
                >
                  <span className="material-symbols-outlined !text-[16px]">delete</span> Delete
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {/* RFQ Summary */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded border border-[var(--erp-border)]">
                  <p className="text-[11px] text-[var(--erp-text-muted)] mb-1">Client</p>
                  <p className="text-sm font-bold text-[var(--erp-text)]">{selectedRFQ.client}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded border border-[var(--erp-border)]">
                  <p className="text-[11px] text-[var(--erp-text-muted)] mb-1">Date Received</p>
                  <p className="text-sm font-bold text-[var(--erp-text)]">{selectedRFQ.date}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded border border-[var(--erp-border)]">
                  <p className="text-[11px] text-[var(--erp-text-muted)] mb-1">Items</p>
                  <p className="text-sm font-bold text-[var(--erp-text)]">{selectedRFQ.items} line items</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded border border-emerald-200">
                  <p className="text-[11px] text-emerald-700 mb-1">Estimated Value</p>
                  <p className="text-sm font-bold text-emerald-700">{selectedRFQ.value}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1">RFQ Details</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'RFQ Number', value: selectedRFQ.number, accent: true },
                      { label: 'Client', value: selectedRFQ.client },
                      { label: 'Channel', value: selectedRFQ.channel.charAt(0).toUpperCase() + selectedRFQ.channel.slice(1) },
                      { label: 'Priority', value: selectedRFQ.priority.charAt(0).toUpperCase() + selectedRFQ.priority.slice(1) },
                      { label: 'Due Date', value: selectedRFQ.dueDate || 'Not specified' },
                    ].map(item => (
                      <div key={item.label} className="flex text-[13px]">
                        <span className="w-28 text-[var(--erp-text-muted)]">{item.label}:</span>
                        <span className={`font-medium ${item.accent ? 'text-[var(--erp-accent)]' : 'text-[var(--erp-text)]'}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1">Notes</h3>
                  <p className="text-[13px] text-[var(--erp-text)]">
                    {selectedRFQ.notes || 'No notes added for this RFQ.'}
                  </p>
                  {linkedQuotation ? (
                    <div className="rounded border border-blue-200 bg-blue-50 p-3 text-[12px] text-blue-800">
                      Linked quotation: {linkedQuotation.number}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Extracted Items */}
              <div className="mb-6">
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">Extracted Items</h3>

                {selectedRfqItems.length > 0 ? (
                  <div className="overflow-hidden rounded border border-[var(--erp-border)]">
                    <table className="w-full text-[13px]">
                      <thead className="bg-slate-100 text-[var(--erp-text-muted)] font-bold uppercase text-[11px] tracking-wider">
                        <tr>
                          <th className="px-3 py-2 text-center w-10">#</th>
                          <th className="px-3 py-2 text-left">Product</th>
                          <th className="px-3 py-2 text-right w-24">Quantity</th>
                          <th className="px-3 py-2 text-left w-20">Unit</th>
                          <th className="px-3 py-2 text-left w-32">Status</th>
                          <th className="px-3 py-2 text-left">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedRfqItems.map((item, index) => (
                          <tr key={item.id || `${item.productId}-${index}`} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-center text-[var(--erp-text-muted)]">{index + 1}</td>
                            <td className="px-3 py-2 font-medium text-[var(--erp-text)]">{item.productName || 'Unnamed item'}</td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-[var(--erp-text-muted)]">{item.unit || 'pcs'}</td>
                            <td className="px-3 py-2 text-[var(--erp-text-muted)]">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                item.availability === 'insufficient_stock'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : item.availability === 'out_of_stock'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : item.availability === 'rejected'
                                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {(item.availability || 'matched').replace('_', ' ').toUpperCase()}
                              </span>
                              {typeof item.availableQuantity === 'number' ? (
                                <div className="mt-1 text-[11px] text-[var(--erp-text-muted)]">
                                  Available: {item.availableQuantity}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-[var(--erp-text-muted)]">
                              {item.notes || item.reason || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded border border-dashed border-[var(--erp-border)] bg-slate-50 px-4 py-5 text-[13px] text-[var(--erp-text-muted)]">
                    <p className="font-medium text-[var(--erp-text)] mb-1">RFQ is empty</p>
                    <p>No line items were extracted for this RFQ yet.</p>
                  </div>
                )}
              </div>

              {/* Status Actions */}
              <div className="mb-6">
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">Update Status</h3>
                <div className="flex gap-2">
                  {['pending', 'draft', 'quoted', 'expired'].map(status => (
                    <button
                      key={status}
                      onClick={() => updateRFQ(selectedRFQ.id, { status: status as RFQ['status'] })}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded border transition-colors ${
                        selectedRFQ.status === status 
                          ? 'bg-[var(--erp-accent)] text-white border-[var(--erp-accent)]' 
                          : 'border-[var(--erp-border)] hover:bg-slate-50'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">Quick Actions</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConvertToQuote(selectedRFQ)}
                    disabled={selectedRFQ.status === 'converted'}
                    className="btn btn-primary btn-md"
                  >
                    <span className="material-symbols-outlined !text-[16px]">receipt_long</span>
                    Generate Quote
                  </button>
                  <button
                    onClick={() => {
                      void handleReplyToClient(selectedRFQ);
                    }}
                    disabled={!selectedClient?.email || sendingEmailType !== null}
                    className="flex items-center gap-1.5 px-3 py-2 border border-[var(--erp-border)] text-[12px] font-medium rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined !text-[16px]">reply</span>
                    {sendingEmailType === 'reply' ? 'Sending Reply...' : 'Reply to Client'}
                  </button>
                  <button
                    onClick={() => {
                      void handleForwardRFQ(selectedRFQ);
                    }}
                    disabled={sendingEmailType !== null}
                    className="flex items-center gap-1.5 px-3 py-2 border border-[var(--erp-border)] text-[12px] font-medium rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined !text-[16px]">forward_to_inbox</span>
                    {sendingEmailType === 'forward' ? 'Sending Forward...' : 'Forward'}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-2 border border-[var(--erp-border)] text-[12px] font-medium rounded hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined !text-[16px]">print</span>
                    Print
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl mb-3">assignment</span>
              <p className="text-sm">Select an RFQ to view details</p>
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {(showAddModal || editingRFQ) && (
        <RFQModal
          rfq={editingRFQ}
          clients={clients}
          products={products}
          onClose={() => { setShowAddModal(false); setEditingRFQ(null); }}
          onSave={(data) => {
            if (editingRFQ) {
              updateRFQ(editingRFQ.id, data);
            } else {
              const newNumber = `RFQ/25-26/${(2048 + rfqs.length + 1).toString()}`;
              addRFQ({ ...data, number: newNumber, date: new Date().toISOString().split('T')[0] } as Omit<RFQ, 'id'>);
            }
            setShowAddModal(false);
            setEditingRFQ(null);
          }}
        />
      )}
    </PageLayout>
  );
};

// RFQ Modal Component
interface RFQModalProps {
  rfq: RFQ | null;
  clients: { id: string; name: string }[];
  products: { id: string; name: string; basePrice: number; unit: string }[];
  onClose: () => void;
  onSave: (data: Partial<RFQ>) => void;
}

const RFQModal: React.FC<RFQModalProps> = ({ rfq, clients, products, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    client: rfq?.client || '',
    clientId: rfq?.clientId || '',
    status: rfq?.status || 'pending',
    channel: rfq?.channel || 'manual',
    priority: rfq?.priority || 'medium',
    dueDate: rfq?.dueDate || '',
    notes: rfq?.notes || '',
  });

  const [items, setItems] = useState<RFQLineItem[]>(
    rfq?.itemDetails?.length
      ? rfq.itemDetails
      : [{ id: '1', productId: '', productName: '', quantity: 1, unit: 'Unit', notes: '' }],
  );

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), productId: '', productName: '', quantity: 1, unit: 'Unit', notes: '' },
    ]);
  };

  const updateItem = (index: number, data: Partial<RFQLineItem>) => {
    setItems((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...data } : item)));
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      return;
    }

    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const estimatedValue = items.reduce((sum, item) => {
    const product = products.find((productItem) => productItem.id === item.productId);
    return sum + (product?.basePrice || 0) * item.quantity;
  }, 0);

  const handleSubmit = () => {
    if (!formData.client || items.some((item) => !item.productId)) return;
    onSave({
      ...formData,
      items: items.length,
      itemDetails: items,
      value: estimatedValue ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(estimatedValue) : '₹0',
    } as Partial<RFQ>);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--erp-border)] bg-slate-50">
          <h3 className="text-lg font-bold text-[var(--erp-text)]">{rfq ? 'Edit RFQ' : 'Create New RFQ'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Client *</label>
            <select
              value={formData.clientId}
              onChange={(e) => {
                const client = clients.find(c => c.id === e.target.value);
                setFormData({ ...formData, clientId: e.target.value, client: client?.name || '' });
              }}
              className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2 bg-white"
            >
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
              />
            </div>
            <div className="bg-slate-50 border border-[var(--erp-border)] rounded px-3 py-2 flex flex-col justify-center">
              <span className="text-[11px] text-[var(--erp-text-muted)]">Estimated Value</span>
              <span className="text-sm font-bold text-[var(--erp-accent)]">
                {estimatedValue
                  ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(estimatedValue)
                  : '₹0'}
              </span>
            </div>
          </div>
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
                    <th className="px-2 py-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-2 py-1.5">
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            const product = products.find((productItem) => productItem.id === e.target.value);
                            updateItem(index, {
                              productId: e.target.value,
                              productName: product?.name || '',
                              unit: product?.unit || item.unit,
                            });
                          }}
                          className="w-full text-[12px] border border-[var(--erp-border)] rounded px-2 py-1 bg-white"
                        >
                          <option value="">Select...</option>
                          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value, 10) || 1 })}
                          className="w-full text-center text-[12px] border border-[var(--erp-border)] rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-[var(--erp-text-muted)]">{item.unit}</td>
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
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Channel</label>
              <select
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value as RFQ['channel'] })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2 bg-white"
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as RFQ['priority'] })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2 bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as RFQ['status'] })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2 bg-white"
              >
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
                <option value="quoted">Quoted</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2 h-20 resize-none"
              placeholder="Additional notes..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--erp-border)] bg-slate-50">
          <button onClick={onClose} className="btn btn-ghost btn-md">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary btn-md">
            {rfq ? 'Update RFQ' : 'Create RFQ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RFQInbox;
