import React, { useEffect, useState, useCallback } from 'react';
import PageLayout from '../components/common/PageLayout';
import { apiRequest, unwrapPaginated } from '../services/api';

type InventoryTab = 'alerts' | 'movements' | 'valuation';

interface StockAlert {
  id: string; name: string; sku: string; stock: number; reorder_level: number; unit: string;
}
interface StockMovement {
  id: string; product_id: string; product?: { id: string; name: string; sku: string };
  type: string; quantity: number; reference_type?: string; reference_id?: string;
  notes?: string; created_at: string;
}
interface ValuationItem {
  id: string; name: string; sku: string; stock: number; cost: number; unit: string; total_value: number;
}

const typeColors: Record<string, string> = {
  IN: 'bg-green-100 text-green-700 border-green-200',
  OUT: 'bg-red-100 text-red-700 border-red-200',
  ADJUSTMENT: 'bg-amber-100 text-amber-700 border-amber-200',
  TRANSFER: 'bg-blue-100 text-blue-700 border-blue-200',
};

const Inventory: React.FC = () => {
  const [tab, setTab] = useState<InventoryTab>('alerts');
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [valuation, setValuation] = useState<{ items: ValuationItem[]; grand_total: number }>({ items: [], grand_total: 0 });
  const [movementFilter, setMovementFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string; sku: string }>>([]);
  const [movementForm, setMovementForm] = useState({
    product_id: '', type: 'IN', quantity: 0, notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await apiRequest<StockAlert[]>('/inventory/alerts');
      setAlerts(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, []);

  const loadMovements = useCallback(async () => {
    try {
      const res = await apiRequest<any>(`/inventory/movements?pageSize=100${movementFilter ? `&type=${movementFilter}` : ''}`);
      setMovements(unwrapPaginated(res));
    } catch { /* ignore */ }
  }, [movementFilter]);

  const loadValuation = useCallback(async () => {
    try {
      const data = await apiRequest<any>('/inventory/valuation');
      setValuation(data || { items: [], grand_total: 0 });
    } catch { /* ignore */ }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await apiRequest<any>('/products?pageSize=500');
      setProducts(unwrapPaginated(res).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (tab === 'alerts') loadAlerts();
    if (tab === 'movements') loadMovements();
    if (tab === 'valuation') loadValuation();
  }, [tab, loadAlerts, loadMovements, loadValuation]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleRecordMovement = async () => {
    if (!movementForm.product_id || movementForm.quantity <= 0) return;
    setSaving(true);
    try {
      await apiRequest('/inventory/movements', {
        method: 'POST', body: JSON.stringify(movementForm),
      });
      setShowModal(false);
      setMovementForm({ product_id: '', type: 'IN', quantity: 0, notes: '' });
      loadMovements();
      loadAlerts();
      loadValuation();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const tabs: { id: InventoryTab; label: string; icon: string }[] = [
    { id: 'alerts', label: 'Stock Alerts', icon: 'warning' },
    { id: 'movements', label: 'Stock Movements', icon: 'swap_vert' },
    { id: 'valuation', label: 'Stock Valuation', icon: 'account_balance' },
  ];

  return (
    <PageLayout>
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {/* Tab bar */}
        <div className="h-11 border-b border-[var(--erp-border)] flex items-center justify-between px-3 bg-slate-50 shrink-0">
          <div className="flex gap-0.5">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium rounded transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-white text-[var(--erp-accent)] shadow-sm border border-[var(--erp-border)]'
                    : 'text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] hover:bg-white/50'
                }`}
                onClick={() => setTab(t.id)}
              >
                <span className="material-symbols-outlined !text-[16px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm flex items-center gap-1">
            <span className="material-symbols-outlined !text-[14px]">add</span>
            Record Movement
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'alerts' && (
            <div className="max-w-4xl">
              <h2 className="text-lg font-bold text-[var(--erp-text)] mb-1">Stock Alerts</h2>
              <p className="text-[12px] text-[var(--erp-text-muted)] mb-4">Products below reorder level, sorted by urgency.</p>
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <span className="material-symbols-outlined text-3xl mb-2">check_circle</span>
                  <p className="text-sm">All stock levels are healthy</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {alerts.map(a => {
                    const urgency = a.reorder_level > 0 ? Math.round((a.stock / a.reorder_level) * 100) : 100;
                    return (
                      <div key={a.id} className="bg-white border border-[var(--erp-border)] rounded shadow-sm p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[13px] font-bold text-[var(--erp-text)]">{a.name}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            urgency <= 25 ? 'bg-red-100 text-red-700 border-red-200' :
                            urgency <= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            'bg-yellow-100 text-yellow-700 border-yellow-200'
                          }`}>
                            {urgency <= 25 ? 'CRITICAL' : urgency <= 50 ? 'LOW' : 'WARNING'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--erp-text-muted)] mb-1">SKU: {a.sku}</div>
                        <div className="flex items-center justify-between text-[12px]">
                          <span>Stock: <b className="text-red-600">{a.stock}</b> {a.unit}</span>
                          <span>Reorder: <b>{a.reorder_level}</b></span>
                        </div>
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            urgency <= 25 ? 'bg-red-500' : urgency <= 50 ? 'bg-amber-500' : 'bg-yellow-500'
                          }`} style={{ width: `${Math.min(urgency, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'movements' && (
            <div className="max-w-5xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--erp-text)]">Stock Movements</h2>
                  <p className="text-[12px] text-[var(--erp-text-muted)]">History of all inventory movements.</p>
                </div>
                <select
                  className="text-[11px] border border-[var(--erp-border)] rounded px-2 py-1 bg-white"
                  value={movementFilter}
                  onChange={e => setMovementFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                  <option value="ADJUSTMENT">ADJUSTMENT</option>
                  <option value="TRANSFER">TRANSFER</option>
                </select>
              </div>
              <table className="w-full text-[12px] border border-[var(--erp-border)] rounded">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Product</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-right px-3 py-2">Quantity</th>
                    <th className="text-left px-3 py-2">Reference</th>
                    <th className="text-left px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id} className="border-t border-[var(--erp-border)] hover:bg-slate-50">
                      <td className="px-3 py-2">{new Date(m.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2 font-medium">{m.product?.name || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${typeColors[m.type] || ''}`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{Number(m.quantity)}</td>
                      <td className="px-3 py-2 text-[var(--erp-text-muted)]">{m.reference_type || '—'}</td>
                      <td className="px-3 py-2 text-[var(--erp-text-muted)] truncate max-w-[200px]">{m.notes || '—'}</td>
                    </tr>
                  ))}
                  {movements.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No movements found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'valuation' && (
            <div className="max-w-5xl">
              <h2 className="text-lg font-bold text-[var(--erp-text)] mb-1">Stock Valuation</h2>
              <p className="text-[12px] text-[var(--erp-text-muted)] mb-4">Current inventory value by product.</p>
              <table className="w-full text-[12px] border border-[var(--erp-border)] rounded">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2">Product</th>
                    <th className="text-left px-3 py-2">SKU</th>
                    <th className="text-right px-3 py-2">Stock Qty</th>
                    <th className="text-right px-3 py-2">Unit Cost</th>
                    <th className="text-right px-3 py-2">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(valuation.items || []).map(v => (
                    <tr key={v.id} className="border-t border-[var(--erp-border)] hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{v.name}</td>
                      <td className="px-3 py-2 text-[var(--erp-text-muted)]">{v.sku}</td>
                      <td className="px-3 py-2 text-right">{v.stock} {v.unit}</td>
                      <td className="px-3 py-2 text-right">₹{Number(v.cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-right font-semibold">₹{Number(v.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {(valuation.items || []).length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No products found</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-[12px] uppercase tracking-wider">Grand Total</td>
                    <td className="px-3 py-2 text-right text-[14px]">₹{Number(valuation.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Record Movement Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-5 py-3 border-b border-[var(--erp-border)] flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[var(--erp-text)]">Record Stock Movement</h3>
                <button onClick={() => setShowModal(false)} className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1 uppercase tracking-wider">Product *</label>
                  <select
                    className="w-full text-[12px] border border-[var(--erp-border)] rounded py-2 px-3 bg-white"
                    value={movementForm.product_id}
                    onChange={e => setMovementForm(prev => ({ ...prev, product_id: e.target.value }))}
                  >
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1 uppercase tracking-wider">Type *</label>
                  <select
                    className="w-full text-[12px] border border-[var(--erp-border)] rounded py-2 px-3 bg-white"
                    value={movementForm.type}
                    onChange={e => setMovementForm(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="IN">IN (Add Stock)</option>
                    <option value="OUT">OUT (Remove Stock)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT (Set Stock)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1 uppercase tracking-wider">Quantity *</label>
                  <input type="number" min="0"
                    className="w-full text-[12px] border border-[var(--erp-border)] rounded py-2 px-3"
                    value={movementForm.quantity}
                    onChange={e => setMovementForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1 uppercase tracking-wider">Notes</label>
                  <textarea
                    className="w-full text-[12px] border border-[var(--erp-border)] rounded py-2 px-3"
                    rows={2}
                    value={movementForm.notes}
                    onChange={e => setMovementForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="px-5 py-3 border-t border-[var(--erp-border)] flex justify-end gap-2">
                <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button onClick={handleRecordMovement} disabled={saving} className="btn btn-primary btn-sm">
                  {saving ? 'Saving...' : 'Record'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageLayout>
  );
};

export default Inventory;
