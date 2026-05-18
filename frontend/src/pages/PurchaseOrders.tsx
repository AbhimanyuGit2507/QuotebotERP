import React, { useEffect, useMemo, useState, useCallback } from 'react';
import PageLayout from '../components/common/PageLayout';
import { apiRequest, unwrapPaginated } from '../services/api';

interface Supplier { id: string; name: string; email?: string; }
interface POItem {
  id?: string; product_id?: string; product_name: string;
  quantity: number; unit_price: number; tax_percent: number; total: number; unit: string;
  received_quantity?: number;
}
interface PO {
  id: string; number: string; supplier_id: string; supplier?: Supplier;
  date: string; expected_delivery?: string; status: string;
  subtotal: number; tax: number; total: number; currency: string;
  notes?: string; items: POItem[]; created_at: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmed: 'bg-amber-100 text-amber-700 border-amber-200',
  partially_received: 'bg-amber-100 text-amber-700 border-amber-200',
  received: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const PurchaseOrders: React.FC = () => {
  const [pos, setPos] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    supplier_id: '', expected_delivery: '', currency: 'INR', notes: '',
    items: [{ product_name: '', quantity: 1, unit_price: 0, tax_percent: 0, unit: 'pcs' }] as Array<{
      product_name: string; quantity: number; unit_price: number; tax_percent: number; unit: string;
    }>,
  });

  const load = useCallback(async () => {
    try {
      const [poRes, supRes] = await Promise.all([
        apiRequest<any>('/purchase-orders?pageSize=200'),
        apiRequest<any>('/suppliers?pageSize=200'),
      ]);
      setPos(unwrapPaginated(poRes));
      setSuppliers(unwrapPaginated(supRes));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() =>
    pos.filter(po => {
      const matchSearch = po.number.toLowerCase().includes(search.toLowerCase()) ||
        (po.supplier?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || po.status === statusFilter;
      return matchSearch && matchStatus;
    }), [pos, search, statusFilter]);

  const selected = pos.find(p => p.id === selectedId);

  const handleCreate = async () => {
    if (!createForm.supplier_id || createForm.items.length === 0) return;
    setSaving(true);
    try {
      const created = await apiRequest<PO>('/purchase-orders', {
        method: 'POST', body: JSON.stringify(createForm),
      });
      setPos(prev => [created, ...prev]);
      setSelectedId(created.id);
      setShowCreate(false);
      setCreateForm({
        supplier_id: '', expected_delivery: '', currency: 'INR', notes: '',
        items: [{ product_name: '', quantity: 1, unit_price: 0, tax_percent: 0, unit: 'pcs' }],
      });
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const updated = await apiRequest<PO>(`/purchase-orders/${id}/status`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      setPos(prev => prev.map(p => p.id === id ? updated : p));
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/purchase-orders/${id}`, { method: 'DELETE' });
      setPos(prev => prev.filter(p => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch { /* ignore */ }
  };

  const addItem = () => {
    setCreateForm(prev => ({
      ...prev,
      items: [...prev.items, { product_name: '', quantity: 1, unit_price: 0, tax_percent: 0, unit: 'pcs' }],
    }));
  };

  const removeItem = (idx: number) => {
    setCreateForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setCreateForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }));
  };

  const statusOptions = selected ? (() => {
    const flow: Record<string, string[]> = {
      draft: ['sent', 'cancelled'],
      sent: ['confirmed', 'cancelled'],
      confirmed: ['partially_received', 'received', 'cancelled'],
      partially_received: ['received'],
      received: [],
      cancelled: [],
    };
    return flow[selected.status] || [];
  })() : [];

  return (
    <PageLayout>
      <main className="flex-1 flex min-w-0 overflow-hidden">
        {/* Left Panel */}
        <div className="w-80 border-r border-[var(--erp-border)] flex flex-col bg-white shrink-0">
          <div className="h-11 border-b border-[var(--erp-border)] flex items-center px-3 gap-2 bg-slate-50 shrink-0">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-[var(--erp-text-muted)]">search</span>
              <input
                className="w-full pl-7 pr-2 py-1.5 text-[12px] border border-[var(--erp-border)] rounded focus:ring-1 focus:ring-[var(--erp-accent)] outline-none"
                placeholder="Search POs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm flex items-center gap-1">
              <span className="material-symbols-outlined !text-[14px]">add</span>
              Create
            </button>
          </div>
          <div className="px-3 py-1.5 border-b border-[var(--erp-border)] bg-slate-50">
            <select
              className="w-full text-[11px] border border-[var(--erp-border)] rounded px-2 py-1 bg-white"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {['draft','sent','confirmed','partially_received','received','cancelled'].map(s => (
                <option key={s} value={s}>{s.replace('_',' ').toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-2">shopping_cart_checkout</span>
                <span className="text-sm">No purchase orders</span>
              </div>
            ) : filtered.map(po => (
              <div
                key={po.id}
                className={`px-3 py-2.5 border-b border-[var(--erp-border)] cursor-pointer transition-colors ${
                  po.id === selectedId ? 'bg-[var(--erp-accent-soft)]' : 'hover:bg-slate-50'
                }`}
                onClick={() => { setSelectedId(po.id); setShowCreate(false); }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--erp-text)]">{po.number}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusColors[po.status] || ''}`}>
                    {po.status.replace('_',' ').toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--erp-text-muted)]">{po.supplier?.name || '—'}</div>
                <div className="text-[10px] text-[var(--erp-text-muted)]">
                  ₹{Number(po.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {showCreate ? (
            <>
              <div className="h-11 border-b border-[var(--erp-border)] flex items-center justify-between px-4 bg-slate-50 shrink-0">
                <h2 className="text-[13px] font-bold text-[var(--erp-text)]">Create Purchase Order</h2>
                <div className="flex gap-2">
                  <button onClick={() => setShowCreate(false)} className="btn btn-secondary btn-sm">Cancel</button>
                  <button onClick={handleCreate} disabled={saving} className="btn btn-primary btn-sm">
                    {saving ? 'Creating...' : 'Create PO'}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="max-w-3xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1 uppercase tracking-wider">Supplier *</label>
                      <select
                        className="w-full text-[12px] border border-[var(--erp-border)] rounded py-2 px-3 bg-white"
                        value={createForm.supplier_id}
                        onChange={e => setCreateForm(prev => ({ ...prev, supplier_id: e.target.value }))}
                      >
                        <option value="">Select supplier...</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1 uppercase tracking-wider">Expected Delivery</label>
                      <input type="date" className="w-full text-[12px] border border-[var(--erp-border)] rounded py-2 px-3"
                        value={createForm.expected_delivery}
                        onChange={e => setCreateForm(prev => ({ ...prev, expected_delivery: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1 uppercase tracking-wider">Notes</label>
                      <textarea className="w-full text-[12px] border border-[var(--erp-border)] rounded py-2 px-3" rows={2}
                        value={createForm.notes}
                        onChange={e => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[12px] font-bold text-[var(--erp-text)] uppercase tracking-wider">Items</h3>
                      <button onClick={addItem} className="btn btn-ghost btn-sm flex items-center gap-1">
                        <span className="material-symbols-outlined !text-[14px]">add</span> Add Item
                      </button>
                    </div>
                    <table className="w-full text-[12px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-[10px] uppercase tracking-wider text-left px-2 py-1.5">Product</th>
                          <th className="text-[10px] uppercase tracking-wider text-right px-2 py-1.5">Qty</th>
                          <th className="text-[10px] uppercase tracking-wider text-right px-2 py-1.5">Price</th>
                          <th className="text-[10px] uppercase tracking-wider text-right px-2 py-1.5">Tax %</th>
                          <th className="text-[10px] uppercase tracking-wider text-right px-2 py-1.5">Unit</th>
                          <th className="text-[10px] uppercase tracking-wider px-2 py-1.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {createForm.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-[var(--erp-border)]">
                            <td className="px-2 py-1"><input className="w-full border border-[var(--erp-border)] rounded px-2 py-1 text-[12px]" value={item.product_name} onChange={e => updateItem(idx, 'product_name', e.target.value)} placeholder="Product name" /></td>
                            <td className="px-2 py-1"><input type="number" className="w-20 border border-[var(--erp-border)] rounded px-2 py-1 text-[12px] text-right" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} /></td>
                            <td className="px-2 py-1"><input type="number" className="w-24 border border-[var(--erp-border)] rounded px-2 py-1 text-[12px] text-right" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} /></td>
                            <td className="px-2 py-1"><input type="number" className="w-16 border border-[var(--erp-border)] rounded px-2 py-1 text-[12px] text-right" value={item.tax_percent} onChange={e => updateItem(idx, 'tax_percent', Number(e.target.value))} /></td>
                            <td className="px-2 py-1"><input className="w-16 border border-[var(--erp-border)] rounded px-2 py-1 text-[12px]" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} /></td>
                            <td className="px-2 py-1">
                              <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                                <span className="material-symbols-outlined !text-[16px]">close</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : selected ? (
            <>
              <div className="h-11 border-b border-[var(--erp-border)] flex items-center justify-between px-4 bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-[13px] font-bold text-[var(--erp-text)]">{selected.number}</h2>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusColors[selected.status] || ''}`}>
                    {selected.status.replace('_',' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-2">
                  {statusOptions.map(s => (
                    <button key={s} onClick={() => handleStatusChange(selected.id, s)} className="btn btn-secondary btn-sm">
                      → {s.replace('_',' ')}
                    </button>
                  ))}
                  {selected.status === 'draft' && (
                    <button onClick={() => handleDelete(selected.id)} className="btn btn-danger btn-sm">Delete</button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="max-w-3xl space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)]">Supplier</span>
                      <p className="text-[13px] font-semibold text-[var(--erp-text)]">{selected.supplier?.name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)]">Date</span>
                      <p className="text-[13px] text-[var(--erp-text)]">{new Date(selected.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--erp-text-muted)]">Expected Delivery</span>
                      <p className="text-[13px] text-[var(--erp-text)]">
                        {selected.expected_delivery ? new Date(selected.expected_delivery).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>
                  {selected.notes && (
                    <div className="p-3 bg-slate-50 rounded border border-[var(--erp-border)] text-[12px] text-[var(--erp-text-muted)]">
                      {selected.notes}
                    </div>
                  )}
                  <div>
                    <h3 className="text-[12px] font-bold text-[var(--erp-text)] uppercase tracking-wider mb-2">Items</h3>
                    <table className="w-full text-[12px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-[10px] uppercase tracking-wider text-left px-3 py-2">Product</th>
                          <th className="text-[10px] uppercase tracking-wider text-right px-3 py-2">Qty</th>
                          <th className="text-[10px] uppercase tracking-wider text-right px-3 py-2">Received</th>
                          <th className="text-[10px] uppercase tracking-wider text-right px-3 py-2">Unit Price</th>
                          <th className="text-[10px] uppercase tracking-wider text-right px-3 py-2">Tax %</th>
                          <th className="text-[10px] uppercase tracking-wider text-right px-3 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selected.items || []).map((item, idx) => (
                          <tr key={idx} className="border-b border-[var(--erp-border)]">
                            <td className="px-3 py-2">{item.product_name}</td>
                            <td className="px-3 py-2 text-right">{Number(item.quantity)}</td>
                            <td className="px-3 py-2 text-right">{Number(item.received_quantity || 0)}</td>
                            <td className="px-3 py-2 text-right">₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right">{Number(item.tax_percent)}%</td>
                            <td className="px-3 py-2 text-right font-semibold">₹{Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 text-right space-y-1">
                      <div className="text-[12px] text-[var(--erp-text-muted)]">Subtotal: ₹{Number(selected.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="text-[12px] text-[var(--erp-text-muted)]">Tax: ₹{Number(selected.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="text-[14px] font-bold text-[var(--erp-text)]">Total: ₹{Number(selected.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">shopping_cart_checkout</span>
              <span className="text-sm">Select a PO or create a new one</span>
            </div>
          )}
        </div>
      </main>
    </PageLayout>
  );
};

export default PurchaseOrders;
