import React, { useEffect, useState } from 'react';
import PageLayout from '../components/common/PageLayout';
import { getBills } from '../services/api';
import { Link } from 'react-router-dom';

const Bills: React.FC = () => {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getBills(100);
        if (!cancelled) setBills(data || []);
      } catch (err) {
        console.error('Failed to load bills', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <PageLayout title="Bills">
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Detected Bills</h2>
          <p className="text-sm text-slate-500">Automatically detected invoices and bills from inbox messages.</p>
        </div>

        <div className="bg-white rounded shadow-sm overflow-hidden">
          <table className="min-w-full text-sm divide-y">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-left">From</th>
                <th className="px-4 py-2 text-left">Invoice #</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-left">Confidence</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {loading ? (
                <tr><td colSpan={7} className="p-4">Loading...</td></tr>
              ) : bills.length === 0 ? (
                <tr><td colSpan={7} className="p-4">No bills detected yet.</td></tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">{bill.subject}</td>
                    <td className="px-4 py-2">{bill.from_email}</td>
                    <td className="px-4 py-2">{bill.invoice_number || '—'}</td>
                    <td className="px-4 py-2 text-right">{bill.amount ? Number(bill.amount).toLocaleString() : '—'}</td>
                    <td className="px-4 py-2">{Math.round((bill.confidence || 0) * 100)}%</td>
                    <td className="px-4 py-2">{bill.status}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {bill.message_id ? (
                          <Link to={`/inbox/${bill.message_id}`} className="text-sm text-blue-600">Open in Inbox</Link>
                        ) : null}
                        <Link to={`/bills/${bill.id}`} className="text-sm text-gray-600">Details</Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
};

export default Bills;
