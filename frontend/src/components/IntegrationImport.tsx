import React, { useState } from 'react';
import Modals, { ManualOverrideModal } from './common/Modals';
import { previewZohoCustomers, importZohoCustomers, previewZohoItems, importZohoItems } from '../services/api';

const IntegrationImport: React.FC<{ provider: 'zoho' | 'odoo'; isOpen: boolean; onClose: () => void; showToast: (msg: string, type?: string) => void }> = ({ provider, isOpen, onClose, showToast }) => {
  const [, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, { externalId: string; localEntity: string; localId: string }>>({});

  const loadPreview = async (type: 'customers' | 'items') => {
    setLoading(true);
    try {
      const resp = type === 'customers' ? await previewZohoCustomers() : await previewZohoItems();
      if (resp?.ok) {
        setRows(resp.rows || []);
      } else {
        showToast('Preview failed', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Preview error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const commitImport = async (type: 'customers' | 'items') => {
    setLoading(true);
    try {
      const ovArray = Object.values(overrides).filter((o) => o.localId && o.externalId);
      await (type === 'customers' ? importZohoCustomers(ovArray) : importZohoItems(ovArray));
      showToast('Import complete', 'success');
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyOverride = (localId: string) => {
    if (!selectedRow) return;
    const externalId = selectedRow.externalId || selectedRow.contact_id || selectedRow.item_id || String(Math.random());
    const localEntity = selectedRow.sku || selectedRow.price ? 'Product' : 'Client';
    setOverrides((prev) => ({ ...prev, [externalId]: { externalId, localEntity, localId } }));
  };

  return (
    <Modals.Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="border-b border-[var(--erp-border)] px-5 py-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--erp-text)]">Import from {provider.toUpperCase()}</h3>
        <button onClick={onClose} className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => loadPreview('customers')} className="btn btn-primary btn-sm">Preview Customers</button>
          <button onClick={() => loadPreview('items')} className="btn btn-primary btn-sm">Preview Items</button>
          <button onClick={() => commitImport('customers')} className="btn btn-ghost btn-sm">Import Customers</button>
          <button onClick={() => commitImport('items')} className="btn btn-ghost btn-sm">Import Items</button>
        </div>

        <div className="max-h-72 overflow-y-auto border border-[var(--erp-border)] rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--erp-text-muted)]">
                <th className="px-3 py-2">External ID</th>
                <th className="px-3 py-2">Name / SKU</th>
                <th className="px-3 py-2">Email / Price</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="odd:bg-white even:bg-slate-50">
                  <td className="px-3 py-2">{r.externalId || r.contact_id || r.item_id}</td>
                  <td className="px-3 py-2">{r.name || r.sku}</td>
                  <td className="px-3 py-2">{r.email || r.price}</td>
                  <td className="px-3 py-2">
                    <button className="text-sm text-[var(--erp-accent)]" onClick={() => { setSelectedRow(r); setOverrideOpen(true); }}>Override</button>
                    {overrides[r.externalId || r.contact_id || r.item_id] && (
                      <div className="text-xs text-[var(--erp-text-muted)]">Mapped → {overrides[r.externalId || r.contact_id || r.item_id].localId}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ManualOverrideModal
        isOpen={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        currentValue={selectedRow?.externalId || selectedRow?.contact_id || selectedRow?.item_id || ''}
        fieldLabel="Local ID (existing record)"
        placeholder="Paste existing local id to map to..."
        onConfirm={(val) => handleApplyOverride(val)}
      />
    </Modals.Modal>
  );
};

export default IntegrationImport;
