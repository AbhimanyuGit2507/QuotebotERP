import React, { useEffect, useMemo, useState } from 'react';
import PageLayout from '../components/common/PageLayout';
import { apiRequest, unwrapPaginated } from '../services/api';

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  gstin?: string;
  pan?: string;
  contact_person?: string;
  payment_terms?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

const emptyForm = (): Partial<Supplier> => ({
  name: '', email: '', phone: '', address: '', city: '', state: '',
  gstin: '', pan: '', contact_person: '', payment_terms: '', notes: '',
});

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Partial<Supplier>>(emptyForm());
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await apiRequest<any>('/suppliers?pageSize=200');
      setSuppliers(unwrapPaginated(res));
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    suppliers.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.contact_person || '').toLowerCase().includes(search.toLowerCase())
    ), [suppliers, search]);

  const selected = suppliers.find(s => s.id === selectedId);

  useEffect(() => {
    if (selected) {
      setForm({ ...selected });
      setIsNew(false);
    }
  }, [selectedId]); // eslint-disable-line

  const handleNew = () => {
    setSelectedId(null);
    setForm(emptyForm());
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = await apiRequest<Supplier>('/suppliers', {
          method: 'POST', body: JSON.stringify(form),
        });
        setSuppliers(prev => [created, ...prev]);
        setSelectedId(created.id);
        setIsNew(false);
      } else if (selectedId) {
        const updated = await apiRequest<Supplier>(`/suppliers/${selectedId}`, {
          method: 'PUT', body: JSON.stringify(form),
        });
        setSuppliers(prev => prev.map(s => s.id === selectedId ? updated : s));
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await apiRequest(`/suppliers/${selectedId}`, { method: 'DELETE' });
      setSuppliers(prev => prev.filter(s => s.id !== selectedId));
      setSelectedId(null);
      setForm(emptyForm());
      setIsNew(false);
    } catch { /* ignore */ }
  };

  const fields = [
    { key: 'name', label: 'Supplier Name', required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'pan', label: 'PAN' },
    { key: 'payment_terms', label: 'Payment Terms' },
    { key: 'notes', label: 'Notes' },
  ];

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
                placeholder="Search suppliers..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button onClick={handleNew} className="btn btn-primary btn-sm flex items-center gap-1">
              <span className="material-symbols-outlined !text-[14px]">add</span>
              Add
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-2">local_shipping</span>
                <span className="text-sm">No suppliers found</span>
              </div>
            ) : filtered.map(s => (
              <div
                key={s.id}
                className={`px-3 py-2.5 border-b border-[var(--erp-border)] cursor-pointer transition-colors ${
                  s.id === selectedId ? 'bg-[var(--erp-accent-soft)]' : 'hover:bg-slate-50'
                }`}
                onClick={() => { setSelectedId(s.id); setIsNew(false); }}
              >
                <div className="text-[13px] font-semibold text-[var(--erp-text)] truncate">{s.name}</div>
                <div className="text-[11px] text-[var(--erp-text-muted)] truncate">{s.email || s.phone || '—'}</div>
                {s.contact_person && (
                  <div className="text-[10px] text-[var(--erp-text-muted)]">{s.contact_person}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {!selectedId && !isNew ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">local_shipping</span>
              <span className="text-sm">Select a supplier or add a new one</span>
            </div>
          ) : (
            <>
              <div className="h-11 border-b border-[var(--erp-border)] flex items-center justify-between px-4 bg-slate-50 shrink-0">
                <h2 className="text-[13px] font-bold text-[var(--erp-text)]">
                  {isNew ? 'New Supplier' : form.name || 'Supplier Details'}
                </h2>
                <div className="flex gap-2">
                  {!isNew && selectedId && (
                    <button onClick={handleDelete} className="btn btn-danger btn-sm">Delete</button>
                  )}
                  <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="max-w-2xl grid grid-cols-2 gap-4">
                  {fields.map(f => (
                    <div key={f.key} className={f.key === 'address' || f.key === 'notes' ? 'col-span-2' : ''}>
                      <label className="block text-[11px] font-medium text-[var(--erp-text-muted)] mb-1 uppercase tracking-wider">
                        {f.label} {f.required && <span className="text-red-500">*</span>}
                      </label>
                      {f.key === 'notes' ? (
                        <textarea
                          className="w-full text-[12px] border border-[var(--erp-border)] rounded py-2 px-3 focus:ring-1 focus:ring-[var(--erp-accent)] outline-none"
                          rows={3}
                          value={(form as any)[f.key] || ''}
                          onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        />
                      ) : (
                        <input
                          type={f.type || 'text'}
                          className="w-full text-[12px] border border-[var(--erp-border)] rounded py-2 px-3 focus:ring-1 focus:ring-[var(--erp-accent)] outline-none"
                          value={(form as any)[f.key] || ''}
                          onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </PageLayout>
  );
};

export default Suppliers;
