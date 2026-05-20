import React, { useEffect, useState } from 'react';
import SettingsLayout from './SettingsLayout';
import { apiRequest } from '../../services/api';

const AIAndAutomation: React.FC = () => {
  const [semanticEnabled, setSemanticEnabled] = useState(false);
  const [semanticWeight, setSemanticWeight] = useState(0.5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const json = await apiRequest<{ settings?: Record<string, unknown> }>(
          '/admin/settings?namespace=item_match.config',
        );
        const settings = json?.settings ?? {};
        setSemanticEnabled(Boolean(settings.semantic_reranker_enabled));
        setSemanticWeight(Number(settings.semantic_weight ?? 0.5));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await apiRequest('/admin/settings?namespace=item_match.config', {
        method: 'PUT',
        body: JSON.stringify({
          semantic_reranker_enabled: semanticEnabled,
          semantic_weight: semanticWeight,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsLayout>
      <div className="max-w-2xl">
        <h2 className="text-[20px] font-bold text-[var(--erp-text)] mb-1">AI &amp; Automation</h2>
        <p className="text-[13px] text-[var(--erp-text-muted)] mb-6">
          Configure the AI pipeline, semantic reranker, and item matching behaviour.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-[var(--erp-text-muted)] text-sm">
            <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
            Loading settings…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Semantic reranker toggle */}
            <div
              className="rounded-xl border border-[var(--erp-border)] p-5"
              style={{ background: 'var(--erp-surface)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-[var(--erp-text)]">Semantic Reranker</p>
                  <p className="text-[12px] text-[var(--erp-text-muted)] mt-0.5">
                    Use a sentence-transformer model to re-rank item matches by semantic similarity.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={semanticEnabled}
                  onClick={() => setSemanticEnabled((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    semanticEnabled ? 'bg-[var(--erp-accent)]' : 'bg-[var(--erp-border)]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      semanticEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Semantic weight slider */}
            <div
              className="rounded-xl border border-[var(--erp-border)] p-5"
              style={{ background: 'var(--erp-surface)' }}
            >
              <p className="text-[14px] font-semibold text-[var(--erp-text)] mb-1">
                Semantic Weight
                <span
                  className="ml-2 text-[13px] font-bold px-2 py-0.5 rounded-md"
                  style={{ background: 'var(--erp-accent)', color: 'white' }}
                >
                  {semanticWeight.toFixed(2)}
                </span>
              </p>
              <p className="text-[12px] text-[var(--erp-text-muted)] mb-3">
                Balance between keyword matching (0) and semantic similarity (1).
              </p>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={semanticWeight}
                onChange={(e) => setSemanticWeight(Number(e.target.value))}
                className="w-full accent-[var(--erp-accent)]"
                disabled={!semanticEnabled}
              />
              <div className="flex justify-between text-[11px] text-[var(--erp-text-muted)] mt-1">
                <span>Keyword</span>
                <span>Semantic</span>
              </div>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => void save()}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                    Saving…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Save Changes
                  </>
                )}
              </button>
              {saved && (
                <span className="text-[13px] text-green-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Saved
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </SettingsLayout>
  );
};

export default AIAndAutomation;
