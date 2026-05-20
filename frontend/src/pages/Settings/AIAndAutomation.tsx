import React, { useEffect, useState } from 'react';
import SettingsLayout from './SettingsLayout';

const tenantIdDefault = 'default';

const AIAndAutomation: React.FC = () => {
  const [semanticEnabled, setSemanticEnabled] = useState(false);
  const [semanticWeight, setSemanticWeight] = useState(0.5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/admin/settings?tenantId=${tenantIdDefault}&namespace=item_match.config`);
        const json = await res.json();
        const settings = json.settings || {};
        setSemanticEnabled(Boolean(settings.semantic_reranker_enabled));
        setSemanticWeight(Number(settings.semantic_weight ?? 0.5));
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function save() {
    setLoading(true);
    const payload = {
      semantic_reranker_enabled: semanticEnabled,
      semantic_weight: semanticWeight,
    };
    await fetch(`/admin/settings?tenantId=${tenantIdDefault}&namespace=item_match.config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setLoading(false);
  }

  return (
    <SettingsLayout>
      <h2 className="text-2xl font-semibold mb-4">AI & Automation</h2>
      <div className="max-w-2xl">
        <div className="mb-4 p-4 border rounded">
          <label className="flex items-center justify-between">
            <span>Enable Semantic Reranker</span>
            <input type="checkbox" checked={semanticEnabled} onChange={(e) => setSemanticEnabled(e.target.checked)} />
          </label>
        </div>

        <div className="mb-4 p-4 border rounded">
          <label className="block mb-2">Semantic Weight: {semanticWeight}</label>
          <input type="range" min={0} max={1} step={0.01} value={semanticWeight} onChange={(e) => setSemanticWeight(Number(e.target.value))} />
        </div>

        <div>
          <button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </SettingsLayout>
  );
};

export default AIAndAutomation;
