import React, { useState, useMemo } from 'react';
import PageLayout from '../components/common/PageLayout';
import { useApp } from '../context/AppContext';

interface ReportItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
}

const Analytics: React.FC = () => {
  const { rfqs, quotes, products, clients, showToast, downloadAnalyticsCsv } = useApp();
  
  const [selectedReportId, setSelectedReportId] = useState<string>('sales-trends');
  const [periodFilter, setPeriodFilter] = useState('quarter');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const reports: ReportItem[] = [
    { id: 'sales-trends', name: 'Sales Trends', icon: 'trending_up', description: 'Revenue and sales over time', category: 'sales' },
    { id: 'rfq-analysis', name: 'RFQ Analysis', icon: 'inbox', description: 'RFQ volume and conversion', category: 'operations' },
    { id: 'quote-performance', name: 'Quote Performance', icon: 'receipt_long', description: 'Quote success rates', category: 'operations' },
    { id: 'product-performance', name: 'Product Performance', icon: 'inventory_2', description: 'Best selling products', category: 'products' },
    { id: 'client-insights', name: 'Client Insights', icon: 'groups', description: 'Client activity and value', category: 'clients' },
    { id: 'channel-breakdown', name: 'Channel Breakdown', icon: 'hub', description: 'RFQ sources analysis', category: 'operations' },
  ];

  const selectedReport = reports.find(r => r.id === selectedReportId);

  // Calculate analytics from real data
  const analytics = useMemo(() => {
    const totalRfqs = rfqs.length;
    const pendingRfqs = rfqs.filter(r => r.status === 'pending').length;
    const quotedRfqs = rfqs.filter(r => r.status === 'quoted').length;
    
    const totalQuotes = quotes.length;
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
    const declinedQuotes = quotes.filter(q => q.status === 'declined').length;
    const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

    const totalRevenue = quotes
      .filter(q => q.status === 'accepted')
      .reduce((sum, q) => sum + q.items.reduce((s, i) => s + i.total, 0), 0);

    const avgDealSize = acceptedQuotes > 0 ? Math.round(totalRevenue / acceptedQuotes) : 0;

    const emailRfqs = rfqs.filter(r => r.channel === 'email').length;
    const whatsappRfqs = rfqs.filter(r => r.channel === 'whatsapp').length;
    const manualRfqs = rfqs.filter(r => r.channel === 'manual').length;

    const activeProducts = products.filter(p => p.status === 'active').length;
    const topClients = clients.filter(c => c.tier === 'top').length;

    return {
      totalRfqs, pendingRfqs, quotedRfqs,
      totalQuotes, acceptedQuotes, declinedQuotes, conversionRate,
      totalRevenue, avgDealSize,
      emailRfqs, whatsappRfqs, manualRfqs,
      activeProducts, topClients,
      totalClients: clients.length,
      totalProducts: products.length,
    };
  }, [rfqs, quotes, products, clients]);

  const handleExport = () => {
    downloadAnalyticsCsv(selectedReportId);
    showToast('Report exported successfully', 'success');
  };

  const handlePrint = () => {
    showToast('Preparing print view...', 'info');
    window.print();
  };

  return (
    <PageLayout>
      {/* Left Panel - Report List */}
      <aside className="w-72 border-r border-[var(--erp-border)] flex flex-col bg-white shrink-0">
        <div className="h-12 border-b border-[var(--erp-border)] bg-slate-50 flex items-center justify-between px-3 shrink-0">
          <h2 className="text-sm font-bold text-[var(--erp-text)] uppercase tracking-wider">Analytics</h2>
          <span className="text-[11px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
            {reports.length} reports
          </span>
        </div>

        {/* Category Filter */}
        <div className="p-2 border-b border-[var(--erp-border)]">
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full text-[11px] border border-[var(--erp-border)] rounded px-2 py-1.5 bg-white"
          >
            <option value="all">All Categories</option>
            <option value="sales">Sales</option>
            <option value="operations">Operations</option>
            <option value="products">Products</option>
            <option value="clients">Clients</option>
          </select>
        </div>

        {/* Report List */}
        <div className="flex-1 overflow-y-auto">
          {reports
            .filter(r => categoryFilter === 'all' || r.category === categoryFilter)
            .map(report => (
            <div 
              key={report.id}
              onClick={() => setSelectedReportId(report.id)}
              className={`px-3 py-3 border-b border-[var(--erp-border)] cursor-pointer transition-colors ${
                selectedReportId === report.id ? 'bg-blue-50 border-l-[3px] border-l-[var(--erp-accent)]' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`material-symbols-outlined !text-[20px] ${selectedReportId === report.id ? 'text-[var(--erp-accent)]' : 'text-slate-400'}`}>
                  {report.icon}
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-[var(--erp-text)]">{report.name}</p>
                  <p className="text-[11px] text-[var(--erp-text-muted)]">{report.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {/* Toolbar */}
        <div className="h-12 border-b border-[var(--erp-border)] bg-slate-50 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-[var(--erp-text-muted)]">Period:</label>
              <select 
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="text-[12px] border border-[var(--erp-border)] rounded py-1 px-2 bg-white"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
            <button 
              onClick={() => showToast('Filters applied', 'success')}
              className="btn btn-primary btn-sm"
            >
              Apply
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="p-1.5 hover:bg-slate-200 rounded" title="Print">
              <span className="material-symbols-outlined !text-[18px] text-[var(--erp-text-muted)]">print</span>
            </button>
            <button onClick={handleExport} className="p-1.5 hover:bg-slate-200 rounded" title="Export">
              <span className="material-symbols-outlined !text-[18px] text-[var(--erp-text-muted)]">download</span>
            </button>
            <button className="p-1.5 hover:bg-slate-200 rounded" title="Refresh">
              <span className="material-symbols-outlined !text-[18px] text-[var(--erp-text-muted)]">refresh</span>
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Report Header */}
          <div className="mb-6 flex justify-between items-end border-b border-[var(--erp-border)] pb-5">
            <div>
              <h1 className="text-xl font-bold text-[var(--erp-text)]">{selectedReport?.name}</h1>
              <p className="text-[11px] text-[var(--erp-text-muted)] mt-1 uppercase tracking-wider">
                Generated: {new Date().toLocaleDateString()} • Period: {periodFilter}
              </p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest">Total Revenue</p>
                <p className="text-lg font-bold text-[var(--erp-text)]">₹{analytics.totalRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest">Avg. Deal</p>
                <p className="text-lg font-bold text-[var(--erp-text)]">₹{analytics.avgDealSize.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined !text-[18px] text-blue-600">inbox</span>
                <span className="text-[11px] font-bold text-blue-600 uppercase">Total RFQs</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{analytics.totalRfqs}</p>
              <p className="text-[11px] text-blue-600 mt-1">{analytics.pendingRfqs} pending</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined !text-[18px] text-green-600">receipt_long</span>
                <span className="text-[11px] font-bold text-green-600 uppercase">Quotes</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{analytics.totalQuotes}</p>
              <p className="text-[11px] text-green-600 mt-1">{analytics.acceptedQuotes} accepted</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined !text-[18px] text-purple-600">percent</span>
                <span className="text-[11px] font-bold text-purple-600 uppercase">Conversion</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{analytics.conversionRate}%</p>
              <p className="text-[11px] text-purple-600 mt-1">{analytics.declinedQuotes} declined</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined !text-[18px] text-amber-600">groups</span>
                <span className="text-[11px] font-bold text-amber-600 uppercase">Clients</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">{analytics.totalClients}</p>
              <p className="text-[11px] text-amber-600 mt-1">{analytics.topClients} top tier</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Channel Breakdown */}
            <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-[var(--erp-border)]">
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">RFQ by Channel</h3>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { label: 'Email', value: analytics.emailRfqs, total: analytics.totalRfqs, color: 'bg-blue-500' },
                  { label: 'WhatsApp', value: analytics.whatsappRfqs, total: analytics.totalRfqs, color: 'bg-green-500' },
                  { label: 'Manual', value: analytics.manualRfqs, total: analytics.totalRfqs, color: 'bg-slate-400' },
                ].map(ch => {
                  const pct = ch.total > 0 ? Math.round((ch.value / ch.total) * 100) : 0;
                  return (
                    <div key={ch.label}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-[var(--erp-text)]">{ch.label}</span>
                        <span className="font-medium">{ch.value} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded overflow-hidden">
                        <div className={`${ch.color} h-full rounded transition-all`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quote Status */}
            <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-[var(--erp-border)]">
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Quote Status Distribution</h3>
              </div>
              <div className="p-4 flex items-center gap-6">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 36 36" className="w-full h-full">
                    <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#e2e8f0" strokeWidth="3"></circle>
                    <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#10b981" strokeWidth="3" 
                      strokeDasharray={`${analytics.conversionRate} ${100 - analytics.conversionRate}`} strokeDashoffset="25"></circle>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-[var(--erp-text)]">{analytics.conversionRate}%</span>
                  </div>
                </div>
                <div className="space-y-2 text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-emerald-500 rounded"></span>
                    <span>Accepted: {analytics.acceptedQuotes}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded"></span>
                    <span>Declined: {analytics.declinedQuotes}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded"></span>
                    <span>Pending: {analytics.totalQuotes - analytics.acceptedQuotes - analytics.declinedQuotes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Detailed Breakdown</h3>
              <button onClick={handleExport} className="text-[11px] text-[var(--erp-accent)] font-medium hover:underline">
                Export CSV →
              </button>
            </div>
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50 text-[10px] text-[var(--erp-text-muted)] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 text-left">Metric</th>
                  <th className="px-4 py-2 text-right">Count</th>
                  <th className="px-4 py-2 text-right">Percentage</th>
                  <th className="px-4 py-2 text-left">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { metric: 'Total RFQs Received', count: analytics.totalRfqs, pct: 100, trend: 'up' },
                  { metric: 'RFQs Converted to Quotes', count: analytics.quotedRfqs, pct: analytics.totalRfqs > 0 ? Math.round((analytics.quotedRfqs / analytics.totalRfqs) * 100) : 0, trend: 'up' },
                  { metric: 'Quotes Accepted', count: analytics.acceptedQuotes, pct: analytics.conversionRate, trend: 'up' },
                  { metric: 'Quotes Declined', count: analytics.declinedQuotes, pct: analytics.totalQuotes > 0 ? Math.round((analytics.declinedQuotes / analytics.totalQuotes) * 100) : 0, trend: 'down' },
                  { metric: 'Active Products', count: analytics.activeProducts, pct: analytics.totalProducts > 0 ? Math.round((analytics.activeProducts / analytics.totalProducts) * 100) : 0, trend: 'stable' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium">{row.metric}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{row.count}</td>
                    <td className="px-4 py-2.5 text-right">{row.pct}%</td>
                    <td className="px-4 py-2.5">
                      <span className={`material-symbols-outlined !text-[16px] ${
                        row.trend === 'up' ? 'text-green-500' : row.trend === 'down' ? 'text-red-500' : 'text-slate-400'
                      }`}>
                        {row.trend === 'up' ? 'trending_up' : row.trend === 'down' ? 'trending_down' : 'trending_flat'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </PageLayout>
  );
};

export default Analytics;
