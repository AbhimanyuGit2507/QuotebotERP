import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import { useApp, Client } from '../context/AppContext';

const ClientLedger: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient, showConfirmModal, quotes, rfqs, downloadClientsCsv } = useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const selectedId = useMemo(() => {
    if (!id || !clients.some((c) => c.id === id)) {
      return clients[0]?.id || null;
    }
    return id;
  }, [id, clients]);

  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const lastSelectedIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedId && id) {
      navigate('/client-ledger', { replace: true });
    } else if (selectedId && id !== selectedId) {
      navigate(`/client-ledger/${selectedId}`, { replace: true });
    }
  }, [id, selectedId, navigate]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           c.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === 'all' || c.tier === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [clients, searchQuery, tierFilter]);

  const selectedClient = clients.find(c => c.id === selectedId);
  const selectedClientCount = selectedClientIds.size;

  const handleToggleSelection = (
    clientId: string,
    index: number,
    shiftKey: boolean,
  ) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedIndexRef.current !== null) {
        const start = Math.min(lastSelectedIndexRef.current, index);
        const end = Math.max(lastSelectedIndexRef.current, index);
        filteredClients.slice(start, end + 1).forEach((client) => {
          next.add(client.id);
        });
      } else if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
    lastSelectedIndexRef.current = index;
  };

  const handleRowClick = (
    event: React.MouseEvent,
    clientId: string,
    index: number,
  ) => {
    if (event.shiftKey) {
      event.preventDefault();
      handleToggleSelection(clientId, index, true);
      return;
    }
    setSelectedClientIds(new Set());
    lastSelectedIndexRef.current = index;
    handleSelectClient(clientId);
  };

  const handleListContainerClick = (event: React.MouseEvent) => {
    if (event.shiftKey) {
      return;
    }
    if (event.target === event.currentTarget) {
      setSelectedClientIds(new Set());
      lastSelectedIndexRef.current = null;
    }
  };

  const handleCheckboxClick = (
    event: React.MouseEvent,
    clientId: string,
    index: number,
  ) => {
    event.stopPropagation();
    handleToggleSelection(clientId, index, event.shiftKey);
  };

  const handleSelectClient = (clientId: string) => {
    navigate(`/client-ledger/${clientId}`);
  };

  // Get client's quotes and RFQs
  const clientQuotes = useMemo(() => {
    if (!selectedClient) return [];
    return quotes.filter(q => q.clientId === selectedClient.id);
  }, [quotes, selectedClient]);

  const clientRfqs = useMemo(() => {
    if (!selectedClient) return [];
    return rfqs.filter(r => r.clientId === selectedClient.id);
  }, [rfqs, selectedClient]);

  const handleDelete = (client: Client) => {
    showConfirmModal(
      'Delete Client',
      `Are you sure you want to delete "${client.name}"? All associated data will be preserved but unlinked.`,
      () => deleteClient(client.id)
    );
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedClientIds);
    if (!ids.length) {
      return;
    }

    showConfirmModal(
      'Delete Clients',
      `Delete ${ids.length} client(s)? All associated data will be preserved but unlinked.`,
      () => {
        ids.forEach((clientId) => deleteClient(clientId));
        setSelectedClientIds(new Set());
      },
    );
  };

  const getTierBadge = (tier: string) => {
    const styles = {
      top: 'bg-amber-100 text-amber-700 border-amber-200',
      regular: 'bg-blue-100 text-blue-700 border-blue-200',
      new: 'bg-green-100 text-green-700 border-green-200',
    };
    return styles[tier as keyof typeof styles] || styles.regular;
  };

  const handleExportClients = () => {
    downloadClientsCsv({
      search: searchQuery || undefined,
      tier: tierFilter === 'all' ? undefined : tierFilter,
    });
  };

  return (
    <PageLayout>
      {/* Left Panel - Client List */}
      <aside className="w-80 bg-white border-r border-[var(--erp-border)] flex flex-col shrink-0">
        <div className="p-3 border-b border-[var(--erp-border)] space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--erp-text)] uppercase">Clients</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleExportClients}
                className="px-2 py-1 border border-[var(--erp-border)] bg-white text-[11px] font-medium rounded hover:bg-slate-50"
                title="Export to CSV"
                data-action="export-csv"
              >
                <span className="material-symbols-outlined !text-[14px]">download</span>
              </button>
              {selectedClientCount === 0 && (
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-primary btn-sm"
                  data-action="new-client"
                >
                  <span className="material-symbols-outlined !text-[14px]">add</span>
                  ADD
                </button>
              )}
              {selectedClientCount > 0 && (
                <>
                  <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                    {selectedClientCount} selected
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
              placeholder="Search clients..."
              className="w-full pl-7 pr-2 py-1.5 text-[12px] border border-[var(--erp-border)] rounded focus:ring-1 focus:ring-[var(--erp-accent)]"
              data-search="clients"
            />
          </div>
          <select 
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="w-full text-[11px] border border-[var(--erp-border)] rounded px-1.5 py-1"
          >
            <option value="all">All Tiers</option>
            <option value="top">Top</option>
            <option value="regular">Regular</option>
            <option value="new">New</option>
          </select>
        </div>
        <div
          className="flex-1 overflow-y-auto select-none"
          onClick={handleListContainerClick}
        >
          {filteredClients.map((client, index) => (
            <div 
              key={client.id}
              onClick={(event) => handleRowClick(event, client.id, index)}
              className={`px-3 py-2.5 border-b border-[var(--erp-border)] cursor-pointer transition-colors ${
                selectedId === client.id || selectedClientIds.has(client.id)
                  ? 'bg-blue-50 border-l-2 border-l-[var(--erp-accent)]'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => handleCheckboxClick(event, client.id, index)}
                      className={`material-symbols-outlined !text-[16px] transition-colors ${
                        selectedClientIds.has(client.id)
                          ? 'text-blue-600'
                          : 'text-slate-400'
                      }`}
                      aria-pressed={selectedClientIds.has(client.id)}
                    >
                      {selectedClientIds.has(client.id) ? 'check_box' : 'check_box_outline_blank'}
                    </button>
                    <p className="text-[12px] font-medium text-[var(--erp-text)] truncate">{client.name}</p>
                  </div>
                  <p className="text-[11px] text-[var(--erp-text-muted)]">{client.city}, {client.state}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTierBadge(client.tier)}`}>
                  {client.tier.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-[var(--erp-text-muted)]">
                <span>{client.totalOrders} orders</span>
                <span className="font-medium">₹{(client.totalValue / 100000).toFixed(1)}L</span>
              </div>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">
              <span className="material-symbols-outlined text-3xl mb-2">groups</span>
              <p>No clients found</p>
            </div>
          )}
        </div>
        <div className="p-2 border-t border-[var(--erp-border)] bg-slate-50 text-[11px] text-[var(--erp-text-muted)]">
          Showing {filteredClients.length} of {clients.length} clients
        </div>
      </aside>

      {/* Main Content - Client Details */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {selectedClient ? (
          <>
            <div className="h-14 border-b border-[var(--erp-border)] flex items-center justify-between px-5 shrink-0 bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--erp-accent)] flex items-center justify-center text-white font-bold text-lg">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[var(--erp-text)]">{selectedClient.name}</h1>
                  <p className="text-[11px] text-[var(--erp-text-muted)]">{selectedClient.email}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getTierBadge(selectedClient.tier)}`}>
                  {selectedClient.tier.toUpperCase()} CLIENT
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditingClient(selectedClient)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[var(--erp-border)] bg-white rounded text-[12px] font-medium hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined !text-[16px]">edit</span> Edit
                </button>
                <button 
                  onClick={() => handleDelete(selectedClient)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-red-200 bg-white rounded text-[12px] font-medium text-red-600 hover:bg-red-50"
                >
                  <span className="material-symbols-outlined !text-[16px]">delete</span> Delete
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-[11px] text-blue-700 mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-700">{selectedClient.totalOrders}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded border border-emerald-200">
                  <p className="text-[11px] text-emerald-700 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-emerald-700">₹{(selectedClient.totalValue / 100000).toFixed(2)}L</p>
                </div>
                <div className="bg-purple-50 p-3 rounded border border-purple-200">
                  <p className="text-[11px] text-purple-700 mb-1">Active Quotes</p>
                  <p className="text-2xl font-bold text-purple-700">{clientQuotes.filter(q => q.status === 'sent' || q.status === 'viewed').length}</p>
                </div>
                <div className="bg-amber-50 p-3 rounded border border-amber-200">
                  <p className="text-[11px] text-amber-700 mb-1">Pending RFQs</p>
                  <p className="text-2xl font-bold text-amber-700">{clientRfqs.filter(r => r.status === 'pending').length}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1">Contact Information</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Email', value: selectedClient.email, icon: 'mail' },
                      { label: 'Phone', value: selectedClient.phone, icon: 'phone' },
                      { label: 'Address', value: selectedClient.address, icon: 'location_on' },
                      { label: 'City', value: `${selectedClient.city}, ${selectedClient.state}`, icon: 'apartment' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2 text-[13px]">
                        <span className="material-symbols-outlined !text-[16px] text-slate-400">{item.icon}</span>
                        <span className="w-20 text-[var(--erp-text-muted)]">{item.label}:</span>
                        <span className="font-medium text-[var(--erp-text)]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1">Business Details</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Type', value: selectedClient.type === 'company' ? 'Company' : 'Individual' },
                      { label: 'GSTIN', value: selectedClient.gst || 'Not Provided' },
                      { label: 'Since', value: new Date(selectedClient.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) },
                      { label: 'Last Order', value: selectedClient.lastOrderAt ? new Date(selectedClient.lastOrderAt).toLocaleDateString('en-IN') : 'N/A' },
                    ].map(item => (
                      <div key={item.label} className="flex text-[13px]">
                        <span className="w-24 text-[var(--erp-text-muted)]">{item.label}:</span>
                        <span className="font-medium text-[var(--erp-text)]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Quotes */}
              <div className="mb-6">
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">Recent Quotations</h3>
                {clientQuotes.length > 0 ? (
                  <div className="border border-[var(--erp-border)] rounded overflow-hidden">
                    <table className="w-full text-[12px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-[var(--erp-text-muted)]">Quote #</th>
                          <th className="text-left px-3 py-2 font-medium text-[var(--erp-text-muted)]">Project</th>
                          <th className="text-left px-3 py-2 font-medium text-[var(--erp-text-muted)]">Date</th>
                          <th className="text-right px-3 py-2 font-medium text-[var(--erp-text-muted)]">Amount</th>
                          <th className="text-center px-3 py-2 font-medium text-[var(--erp-text-muted)]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--erp-border)]">
                        {clientQuotes.slice(0, 5).map(quote => (
                          <tr key={quote.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-[var(--erp-accent)] font-medium">{quote.number}</td>
                            <td className="px-3 py-2">{quote.project}</td>
                            <td className="px-3 py-2">{quote.date}</td>
                            <td className="px-3 py-2 text-right">₹{(quote.total || 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                quote.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                quote.status === 'declined' ? 'bg-red-100 text-red-700' :
                                quote.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {quote.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No quotations for this client yet</p>
                )}
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest border-b border-[var(--erp-border)] pb-1 mb-3">Quick Actions</h3>
                <div className="flex gap-2">
                  <button className="btn btn-primary btn-md">
                    <span className="material-symbols-outlined !text-[16px]">add</span>
                    New Quote
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 border border-[var(--erp-border)] text-[12px] font-medium rounded hover:bg-slate-50">
                    <span className="material-symbols-outlined !text-[16px]">mail</span>
                    Send Email
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 border border-[var(--erp-border)] text-[12px] font-medium rounded hover:bg-slate-50">
                    <span className="material-symbols-outlined !text-[16px]">history</span>
                    View Ledger
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl mb-3">groups</span>
              <p className="text-sm">Select a client to view details</p>
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {(showAddModal || editingClient) && (
        <ClientModal
          client={editingClient}
          onClose={() => { setShowAddModal(false); setEditingClient(null); }}
          onSave={(data) => {
            if (editingClient) {
              updateClient(editingClient.id, data);
            } else {
              addClient({ ...data, totalOrders: 0, totalValue: 0, createdAt: new Date().toISOString().split('T')[0] } as Omit<Client, 'id'>);
            }
            setShowAddModal(false);
            setEditingClient(null);
          }}
        />
      )}
    </PageLayout>
  );
};

// Client Modal Component
interface ClientModalProps {
  client: Client | null;
  onClose: () => void;
  onSave: (data: Partial<Client>) => void;
}

const ClientModal: React.FC<ClientModalProps> = ({ client, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    type: client?.type || 'company',
    email: client?.email || '',
    phone: client?.phone || '',
    gst: client?.gst || '',
    address: client?.address || '',
    city: client?.city || '',
    state: client?.state || '',
    tier: client?.tier || 'new',
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.phone) return;
    onSave(formData as Partial<Client>);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--erp-border)] bg-slate-50">
          <h3 className="text-lg font-bold text-[var(--erp-text)]">{client ? 'Edit Client' : 'Add New Client'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Company/Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                placeholder="Enter company or individual name"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'company' | 'individual' })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2 bg-white"
              >
                <option value="company">Company</option>
                <option value="individual">Individual</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Tier</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value as 'top' | 'regular' | 'new' })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2 bg-white"
              >
                <option value="new">New</option>
                <option value="regular">Regular</option>
                <option value="top">Top</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                placeholder="email@company.com"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">GSTIN</label>
            <input
              type="text"
              value={formData.gst}
              onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
              className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
              placeholder="27AABCA1234A1ZA"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
              placeholder="Street address"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                placeholder="State"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--erp-border)] bg-slate-50">
          <button onClick={onClose} className="btn btn-ghost btn-md">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary btn-md">
            {client ? 'Update Client' : 'Add Client'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientLedger;
