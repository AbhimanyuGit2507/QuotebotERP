import React, { useEffect, useState } from 'react';
import PageLayout from '../components/common/PageLayout';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Tab = 'runs' | 'aliases' | 'proposals';

const ItemIntelligenceAdmin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('proposals');
  const [runs, setRuns] = useState<any[]>([]);
  const [aliases, setAliases] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const tenantId = user?.tenant_id;
      if (!tenantId) return;

      const [runsRes, aliasesRes, proposalsRes] = await Promise.all([
        apiRequest<any[]>(`/item-intelligence/runs?tenant_id=${tenantId}`).catch(() => []),
        apiRequest<any[]>(`/item-intelligence/aliases?tenant_id=${tenantId}`).catch(() => []),
        apiRequest<any[]>(`/item-intelligence/alias-proposals?tenant_id=${tenantId}&pending_only=true`).catch(() => []),
      ]);

      setRuns(runsRes || []);
      setAliases(aliasesRes || []);
      setProposals(proposalsRes || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAcceptProposal = async (proposalId: string) => {
    try {
      await apiRequest(`/item-intelligence/alias-proposals/${proposalId}/accept`, {
        method: 'POST',
        headers: { 'x-tenant-id': user?.tenant_id },
        body: JSON.stringify({ tenant_id: user?.tenant_id }),
      });
      await loadData();
    } catch (e) {
      console.error('Failed to accept proposal:', e);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      await apiRequest(`/item-intelligence/alias-proposals/${proposalId}/reject`, {
        method: 'POST',
        headers: { 'x-tenant-id': user?.tenant_id },
        body: JSON.stringify({ tenant_id: user?.tenant_id }),
      });
      await loadData();
    } catch (e) {
      console.error('Failed to reject proposal:', e);
    }
  };

  return (
    <PageLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Item Intelligence Management</h1>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4 border-b">
          <button
            onClick={() => setActiveTab('proposals')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'proposals'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Proposals ({proposals.length})
          </button>
          <button
            onClick={() => setActiveTab('aliases')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'aliases'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Aliases ({aliases.length})
          </button>
          <button
            onClick={() => setActiveTab('runs')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'runs'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Runs ({runs.length})
          </button>
        </div>

        {loading && <p className="text-gray-600">Loading...</p>}

        {/* Proposals Tab */}
        {activeTab === 'proposals' && !loading && (
          <div>
            <h2 className="text-lg font-bold mb-4">Pending Alias Proposals</h2>
            {proposals.length === 0 ? (
              <p className="text-gray-600">No pending proposals</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Input Text</th>
                      <th className="border p-2 text-left">Canonical Product</th>
                      <th className="border p-2 text-right">Confidence</th>
                      <th className="border p-2 text-right">Feedbacks</th>
                      <th className="border p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-gray-50">
                        <td className="border p-2 text-sm">{p.input_text}</td>
                        <td className="border p-2 text-sm">{p.canonical_product_id}</td>
                        <td className="border p-2 text-sm text-right">
                          {(Number(p.confidence) * 100).toFixed(1)}%
                        </td>
                        <td className="border p-2 text-sm text-right">{p.feedback_count}</td>
                        <td className="border p-2 text-center space-x-2">
                          <button
                            onClick={() => handleAcceptProposal(p.id)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectProposal(p.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Aliases Tab */}
        {activeTab === 'aliases' && !loading && (
          <div>
            <h2 className="text-lg font-bold mb-4">Active Aliases</h2>
            {aliases.length === 0 ? (
              <p className="text-gray-600">No aliases configured</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Alias</th>
                      <th className="border p-2 text-left">Canonical Product</th>
                      <th className="border p-2 text-left">Source</th>
                      <th className="border p-2 text-right">Weight</th>
                      <th className="border p-2 text-left">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aliases.map((a) => (
                      <tr key={a.id} className="border-t hover:bg-gray-50">
                        <td className="border p-2 text-sm">{a.alias_text}</td>
                        <td className="border p-2 text-sm">{a.canonical_product_id}</td>
                        <td className="border p-2 text-sm">{a.source || 'manual'}</td>
                        <td className="border p-2 text-sm text-right">{a.weight}</td>
                        <td className="border p-2 text-sm">
                          {new Date(a.updated_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Runs Tab */}
        {activeTab === 'runs' && !loading && (
          <div>
            <h2 className="text-lg font-bold mb-4">Recent Match Runs</h2>
            {runs.length === 0 ? (
              <p className="text-gray-600">No runs recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Input</th>
                      <th className="border p-2 text-left">Best Match</th>
                      <th className="border p-2 text-right">Confidence</th>
                      <th className="border p-2 text-center">Auto</th>
                      <th className="border p-2 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id} className="border-t hover:bg-gray-50">
                        <td className="border p-2 text-sm">{r.input_text}</td>
                        <td className="border p-2 text-sm">{r.best_match_id}</td>
                        <td className="border p-2 text-sm text-right">
                          {r.confidence ? (Number(r.confidence) * 100).toFixed(1) + '%' : 'N/A'}
                        </td>
                        <td className="border p-2 text-sm text-center">
                          {r.auto_applied ? '✓' : '-'}
                        </td>
                        <td className="border p-2 text-sm">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default ItemIntelligenceAdmin;
