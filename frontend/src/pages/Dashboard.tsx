import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';

interface NeedsAttentionData {
  staleQuotes: any[];
  overdueInvoices: any[];
  inactiveClients: any[];
}

const KpiSkeleton: React.FC = () => (
  <div className="bg-white p-3 animate-pulse">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-[18px] h-[18px] bg-slate-200 rounded" />
      <div className="h-3 bg-slate-200 rounded w-20" />
    </div>
    <div className="h-7 bg-slate-200 rounded w-12 mb-1" />
    <div className="h-3 bg-slate-200 rounded w-16" />
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { rfqs, quotes, clients, products, invoices, showToast } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [needsAttention, setNeedsAttention] = useState<NeedsAttentionData | null>(null);

  useEffect(() => {
    apiRequest<NeedsAttentionData>('/suggestions/follow-ups')
      .then(setNeedsAttention)
      .catch(() => { /* silently ignore if endpoint not available */ });
  }, []);

  // Calculate KPI data from real state
  const kpiData = useMemo(() => {
    const pendingRfqs = rfqs.filter(r => r.status === 'pending').length;
    const totalRfqs = rfqs.length;
    const sentQuotes = quotes.filter(q => q.status === 'sent').length;
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
    const declinedQuotes = quotes.filter(q => q.status === 'declined').length;
    const totalQuotes = quotes.length;
    const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;
    
    const openInvoices = invoices.filter((inv) => inv.status === 'open').length;
    const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;

    return [
      { label: 'Total RFQs', value: totalRfqs.toString(), sub: `${pendingRfqs} pending`, subColor: 'text-yellow-600', icon: 'inbox' },
      { label: 'Quotes Sent', value: sentQuotes.toString(), sub: `Total: ${totalQuotes}`, subColor: 'text-[var(--erp-accent)]', icon: 'send' },
      { label: 'Accepted', value: acceptedQuotes.toString(), sub: `Rate: ${conversionRate}%`, subColor: 'text-green-600', icon: 'check_circle' },
      { label: 'Declined', value: declinedQuotes.toString(), sub: `${totalQuotes > 0 ? Math.round((declinedQuotes / totalQuotes) * 100) : 0}% decline`, subColor: 'text-red-500', icon: 'cancel' },
      { label: 'Products', value: products.length.toString(), sub: `${products.filter(p => p.status === 'active').length} active`, subColor: 'text-purple-600', icon: 'inventory_2' },
      { label: 'Clients', value: clients.length.toString(), sub: `${clients.filter(c => c.tier === 'top').length} top tier`, subColor: 'text-amber-600', icon: 'groups' },
      { label: 'Open Invoices', value: openInvoices.toString(), sub: `Paid: ${paidInvoices}`, subColor: 'text-emerald-600', icon: 'receipt' },
      { label: 'Paid Invoices', value: paidInvoices.toString(), sub: `Open: ${openInvoices}`, subColor: 'text-cyan-600', icon: 'credit_score' },
    ];
  }, [rfqs, quotes, clients, products, invoices]);

  // Status distribution for chart
  const quoteStatusData = useMemo(() => {
    const total = quotes.length || 1;
    const accepted = quotes.filter(q => q.status === 'accepted').length;
    const declined = quotes.filter(q => q.status === 'declined').length;
    const pending = quotes.filter(q => q.status === 'draft' || q.status === 'sent').length;
    return {
      accepted: Math.round((accepted / total) * 100),
      declined: Math.round((declined / total) * 100),
      pending: Math.round((pending / total) * 100),
    };
  }, [quotes]);

  // Channel distribution
  const channelData = useMemo(() => {
    const total = rfqs.length || 1;
    const email = rfqs.filter(r => r.channel === 'email').length;
    const whatsapp = rfqs.filter(r => r.channel === 'whatsapp').length;
    const manual = rfqs.filter(r => r.channel === 'manual').length;
    return [
      { channel: 'Email', pct: Math.round((email / total) * 100), color: 'bg-blue-500' },
      { channel: 'WhatsApp', pct: Math.round((whatsapp / total) * 100), color: 'bg-green-500' },
      { channel: 'Manual', pct: Math.round((manual / total) * 100), color: 'bg-slate-400' },
    ];
  }, [rfqs]);

  // Helper to calculate time ago
  const getTimeAgo = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }, []);

  // Recent RFQs (sorted by date, limited to 5)
  const recentRfqs = useMemo(() => {
    return [...rfqs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [rfqs]);

  // Activity feed generated from recent data
  const activityFeed = useMemo(() => {
    const activities: { time: string; icon: string; color: string; text: string; action: string; onClick: () => void }[] = [];
    
    // Add recent RFQs as activities
    recentRfqs.slice(0, 2).forEach((rfq) => {
      activities.push({
        time: getTimeAgo(rfq.date),
        icon: 'mail',
        color: 'text-blue-500',
        text: `RFQ ${rfq.number} from ${rfq.client}`,
        action: 'View',
        onClick: () => navigate('/rfq-inbox'),
      });
    });
    
    // Add recent quotes
    quotes.filter(q => q.status === 'sent').slice(0, 1).forEach(quote => {
      activities.push({
        time: getTimeAgo(quote.date),
        icon: 'send',
        color: 'text-green-500',
        text: `Quote ${quote.number} sent to ${quote.client}`,
        action: 'Track',
        onClick: () => navigate('/quotations'),
      });
    });
    
    return activities;
  }, [recentRfqs, quotes, navigate, getTimeAgo]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      draft: 'bg-blue-100 text-blue-800 border-blue-200',
      quoted: 'bg-green-100 text-green-800 border-green-200',
      expired: 'bg-red-100 text-red-800 border-red-200',
      converted: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return styles[status] || styles.pending;
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showToast('Dashboard refreshed', 'success');
    }, 600);
  };

  const handleKPIClick = (index: number) => {
    switch (index) {
      case 0: // Total RFQs
        navigate('/rfq-inbox');
        break;
      case 1: // Quotes Sent
        navigate('/quotations');
        break;
      case 2: // Accepted
        navigate('/quotations');
        showToast('Filter by accepted status in quotations page', 'info');
        break;
      case 3: // Declined
        navigate('/quotations');
        showToast('Filter by declined status in quotations page', 'info');
        break;
      case 4: // Products
        navigate('/products');
        break;
      case 5: // Clients
        navigate('/client-ledger');
        break;
    }
  };

  return (
    <PageLayout>
      <main className="flex-1 bg-white flex flex-col overflow-hidden">
        {/* Quick Actions Bar */}
        <div className="h-auto sm:h-12 bg-slate-50 border-b border-[var(--erp-border)] flex flex-wrap items-center justify-between px-2 sm:px-4 py-2 sm:py-0 shrink-0 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => navigate('/quotations')}
              className="btn btn-primary btn-sm"
            >
              <span className="material-symbols-outlined !text-[16px]">add</span>
              Create Quote
            </button>
            <button 
              onClick={() => navigate('/rfq-inbox')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-[var(--erp-border)] text-[12px] font-medium rounded hover:bg-white text-[var(--erp-text)]"
            >
              <span className="material-symbols-outlined !text-[16px]">inbox</span>
              Go to RFQ Inbox
            </button>
            <button 
              onClick={() => navigate('/products')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-[var(--erp-border)] text-[12px] font-medium rounded hover:bg-white text-[var(--erp-text)]"
            >
              <span className="material-symbols-outlined !text-[16px]">inventory_2</span>
              Manage Products
            </button>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--erp-text-muted)]">
            <span className="hidden sm:inline">Last updated: just now</span>
            <button onClick={handleRefresh} className="text-[var(--erp-accent)] hover:underline font-medium">Refresh</button>
          </div>
        </div>

        {/* KPI Cards - responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px bg-[var(--erp-border)] border-b border-[var(--erp-border)] shrink-0">
          {isLoading
            ? Array.from({ length: 8 }).map((_, idx) => <KpiSkeleton key={idx} />)
            : kpiData.map((kpi, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleKPIClick(idx)}
                  className="bg-white p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined !text-[18px] text-[var(--erp-text-muted)]">{kpi.icon}</span>
                    <p className="text-[11px] text-[var(--erp-text-muted)] uppercase font-bold truncate">{kpi.label}</p>
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--erp-text)]">{kpi.value}</h3>
                  <p className={`text-[11px] ${kpi.subColor} mt-0.5`}>{kpi.sub}</p>
                </div>
              ))}
        </div>

        {/* Needs Attention Section */}
        {needsAttention && (
          <div className="bg-slate-50 border-b border-[var(--erp-border)] px-4 py-2.5 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined !text-[16px] text-amber-500">notification_important</span>
              <span className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-wider">Needs Attention</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { count: needsAttention.staleQuotes.length, label: 'Stale Quotes', icon: 'schedule' },
                { count: needsAttention.overdueInvoices.length, label: 'Overdue Invoices', icon: 'warning' },
                { count: needsAttention.inactiveClients.length, label: 'Inactive Clients', icon: 'person_off' },
              ].map((item) => {
                const isCritical = item.count > 5;
                return (
                  <div
                    key={item.label}
                    onClick={() => navigate('/analytics?tab=suggestions')}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded cursor-pointer transition-colors ${
                      isCritical
                        ? 'bg-red-50 border border-red-200 hover:bg-red-100'
                        : item.count > 0
                        ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100'
                        : 'bg-green-50 border border-green-200'
                    }`}
                  >
                    <span className={`material-symbols-outlined !text-[20px] ${isCritical ? 'text-red-500' : item.count > 0 ? 'text-amber-500' : 'text-green-500'}`}>{item.icon}</span>
                    <div>
                      <p className={`text-lg font-bold ${isCritical ? 'text-red-700' : item.count > 0 ? 'text-amber-700' : 'text-green-700'}`}>{item.count}</p>
                      <p className="text-[10px] font-semibold text-[var(--erp-text-muted)] uppercase">{item.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-auto p-2 sm:p-4 bg-slate-50">
            {/* Charts Row - responsive grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* RFQ vs Quote Timeline */}
              <div className="bg-white border border-[var(--erp-border)] rounded shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/rfq-inbox')}>
                <div className="px-3 py-2 border-b border-[var(--erp-border)] flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">RFQ vs Quote Trend</span>
                  <select 
                    className="text-[10px] border border-[var(--erp-border)] rounded px-1.5 py-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                  </select>
                </div>
                <div className="p-3 h-36">
                  <div className="flex items-end justify-between h-full gap-1.5">
                    {[rfqs.length * 10, 45, 80, 55, quotes.length * 15, 70, 85].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full flex gap-0.5">
                          <div className="flex-1 bg-blue-400 rounded-t transition-all hover:bg-blue-500" style={{ height: `${Math.min(h, 100)}%` }}></div>
                          <div className="flex-1 bg-emerald-400 rounded-t transition-all hover:bg-emerald-500" style={{ height: `${Math.min(h * 0.7, 100)}%` }}></div>
                        </div>
                        <span className="text-[9px] text-slate-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-3 pb-2 flex gap-4 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded"></span>RFQs ({rfqs.length})</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded"></span>Quotes ({quotes.length})</span>
                </div>
              </div>

              {/* Acceptance Rate Pie */}
              <div className="bg-white border border-[var(--erp-border)] rounded shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/quotations')}>
                <div className="px-3 py-2 border-b border-[var(--erp-border)]">
                  <span className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Quote Status</span>
                </div>
                <div className="p-3 flex items-center gap-4">
                  <div className="relative w-24 h-24 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                      <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#e2e8f0" strokeWidth="3"></circle>
                      <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#10b981" strokeWidth="3" strokeDasharray={`${quoteStatusData.accepted} ${100 - quoteStatusData.accepted}`} strokeDashoffset="25"></circle>
                      <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#ef4444" strokeWidth="3" strokeDasharray={`${quoteStatusData.declined} ${100 - quoteStatusData.declined}`} strokeDashoffset={`${25 - quoteStatusData.accepted}`}></circle>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-[var(--erp-text)]">{quoteStatusData.accepted}%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded"></span>Accepted: {quoteStatusData.accepted}%</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-red-500 rounded"></span>Declined: {quoteStatusData.declined}%</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-amber-500 rounded"></span>Pending: {quoteStatusData.pending}%</div>
                  </div>
                </div>
              </div>

              {/* Channel Split */}
              <div className="bg-white border border-[var(--erp-border)] rounded shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/rfq-inbox')}>
                <div className="px-3 py-2 border-b border-[var(--erp-border)]">
                  <span className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">RFQ by Channel</span>
                </div>
                <div className="p-3 space-y-3">
                  {channelData.map(ch => (
                    <div key={ch.channel}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[var(--erp-text)]">{ch.channel}</span>
                        <span className="font-medium">{ch.pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                        <div className={`${ch.color} h-full rounded transition-all`} style={{ width: `${ch.pct}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent RFQs Table */}
            <div className="bg-white border border-[var(--erp-border)] rounded shadow-sm">
              <div className="px-3 py-2 border-b border-[var(--erp-border)] flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Recent RFQs</span>
                <button 
                  onClick={() => navigate('/rfq-inbox')}
                  className="text-[11px] text-[var(--erp-accent)] font-medium hover:underline"
                >
                  View All →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-slate-50 text-[10px] text-[var(--erp-text-muted)] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">RFQ Number</th>
                      <th className="px-3 py-2 text-left">Client</th>
                      <th className="px-3 py-2 text-center">Items</th>
                      <th className="px-3 py-2 text-right">Value</th>
                      <th className="px-3 py-2 text-center">Status</th>
                      <th className="px-3 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentRfqs.map(rfq => (
                      <tr key={rfq.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-[var(--erp-text-muted)] whitespace-nowrap">{rfq.date}</td>
                        <td className="px-3 py-2 font-medium text-[var(--erp-accent)] whitespace-nowrap">{rfq.number}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{rfq.client}</td>
                        <td className="px-3 py-2 text-center">{rfq.items}</td>
                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{rfq.value}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getStatusBadge(rfq.status)}`}>
                            {rfq.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button 
                            onClick={() => navigate('/rfq-inbox')}
                            className="text-[var(--erp-accent)] hover:underline font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Sidebar - hidden on mobile, shown on lg+ */}
          <aside className="w-full lg:w-64 bg-white border-t lg:border-t-0 lg:border-l border-[var(--erp-border)] overflow-auto shrink-0">
            {/* Activity Feed */}
            <div className="border-b border-[var(--erp-border)]">
              <div className="px-3 py-2 bg-slate-50 border-b border-[var(--erp-border)]">
                <span className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Activity Feed</span>
              </div>
              <div className="divide-y divide-slate-100">
                {activityFeed.map((activity, i) => (
                  <div key={i} className="px-3 py-2.5 hover:bg-slate-50">
                    <div className="flex items-start gap-2">
                      <span className={`material-symbols-outlined !text-[16px] ${activity.color} mt-0.5`}>{activity.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-[var(--erp-text)] line-clamp-2">{activity.text}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-[var(--erp-text-muted)]">{activity.time}</span>
                          <button 
                            onClick={activity.onClick}
                            className="text-[10px] text-[var(--erp-accent)] font-medium hover:underline"
                          >
                            {activity.action}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {activityFeed.length === 0 && (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">
                    No recent activity
                  </div>
                )}
              </div>
            </div>

            {/* System Status */}
            <div>
              <div className="px-3 py-2 bg-slate-50 border-b border-[var(--erp-border)]">
                <span className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">System Status</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="material-symbols-outlined !text-[14px] text-green-500">check_circle</span>
                  <span className="flex-1">WhatsApp</span>
                  <span className="text-green-600 font-medium">Connected</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="material-symbols-outlined !text-[14px] text-green-500">check_circle</span>
                  <span className="flex-1">Email Sync</span>
                  <span className="text-green-600 font-medium">Active</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="material-symbols-outlined !text-[14px] text-amber-500">warning</span>
                  <span className="flex-1">Pending RFQs</span>
                  <span className="text-amber-600 font-medium">{rfqs.filter(r => r.status === 'pending').length} items</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="border-t border-[var(--erp-border)]">
              <div className="px-3 py-2 bg-slate-50 border-b border-[var(--erp-border)]">
                <span className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Quick Stats</span>
              </div>
              <div className="p-3 space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[var(--erp-text-muted)]">Active Products</span>
                  <span className="font-medium">{products.filter(p => p.status === 'active').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--erp-text-muted)]">Total Clients</span>
                  <span className="font-medium">{clients.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--erp-text-muted)]">Top Clients</span>
                  <span className="font-medium text-amber-600">{clients.filter(c => c.tier === 'top').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--erp-text-muted)]">Draft Quotes</span>
                  <span className="font-medium">{quotes.filter(q => q.status === 'draft').length}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </PageLayout>
  );
};

export default Dashboard;
