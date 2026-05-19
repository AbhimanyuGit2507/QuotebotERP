import React, { useEffect, useState } from 'react';
import PageLayout from '../components/common/PageLayout';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ItemIntelligenceAdmin: React.FC = () => {
  const { user } = useAuth();
  const [runs, setRuns] = useState<any[]>([]);
  const [aliases, setAliases] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const tenantId = user?.tenant_id;
        const runsRes = await apiRequest<any[]>(`/item-intelligence/runs?tenant_id=${tenantId}`);
        const aliasesRes = await apiRequest<any[]>(`/item-intelligence/aliases?tenant_id=${tenantId}`);
        setRuns(runsRes || []);
        setAliases(aliasesRes || []);
      } catch (e: any) {
        // ignore
      }
    };
    void load();
  }, [user]);

  return (
    <PageLayout>
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">Item Intelligence — Runs</h2>
        <div className="mb-6">
          <table className="w-full table-auto">
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Input</th>
                <th>Best Match</th>
                <th>Confidence</th>
                <th>Auto</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 text-[12px]">{r.id}</td>
                  <td className="p-2 text-[12px]">{r.input_text}</td>
                  <td className="p-2 text-[12px]">{r.best_match_id}</td>
                  <td className="p-2 text-[12px]">{r.confidence}</td>
                  <td className="p-2 text-[12px]">{String(r.auto_applied)}</td>
                  <td className="p-2 text-[12px]">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-bold mb-4">Aliases</h2>
        <div>
          <table className="w-full table-auto">
            <thead>
              <tr>
                <th>Alias</th>
                <th>Canonical Product</th>
                <th>Weight</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {aliases.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-2 text-[12px]">{a.alias_text}</td>
                  <td className="p-2 text-[12px]">{a.canonical_product_id}</td>
                  <td className="p-2 text-[12px]">{a.weight}</td>
                  <td className="p-2 text-[12px]">{new Date(a.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
};

export default ItemIntelligenceAdmin;
