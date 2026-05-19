import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';

interface ReportItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
}

// ---------- Type definitions for API responses ----------

interface FunnelStage {
  name: string;
  count: number;
  rate: number;
}

interface MonthlyTrend {
  month: string;
  actual?: number;
  projected?: number;
}

interface RevenueForecast {
  pipelineValue: number;
  conversionRate: number;
  projectedRevenue: number;
  monthlyTrend: MonthlyTrend[];
}

interface ClientInsight {
  id: string;
  name: string;
  revenue: number;
  acceptanceRate: number;
  avgResponseDays: number | null;
  growth: number;
}

interface ProductPerf {
  id: string;
  name: string;
  sku: string;
  quoteCount: number;
  revenue: number;
  marginPercent: number;
  avgUnitPrice: number;
}

interface AIPipelineMetrics {
  parseSuccessRate: number;
  autoQuoteRate: number;
  avgConfidence: number;
  totalParseRuns: number;
  totalRfqs: number;
}

interface StaleQuote {
  id: string;
  number: string;
  clientName: string;
  total: number;
  daysSinceSent: number;
  sentAt: string;
}

interface OverdueInvoice {
  id: string;
  number: string;
  clientName: string;
  amountDue: number;
  daysOverdue: number;
  dueDate: string;
}

interface InactiveClient {
  id: string;
  name: string;
  lastActivityDate: string | null;
  totalHistoricalValue: number;
}

interface FollowUps {
  staleQuotes: StaleQuote[];
  overdueInvoices: OverdueInvoice[];
  inactiveClients: InactiveClient[];
}

type TabKey = 'sales' | 'bi' | 'suggestions';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'sales', label: 'Sales Reports', icon: 'trending_up' },
  { key: 'bi', label: 'Business Intelligence', icon: 'insights' },
  { key: 'suggestions', label: 'Suggestions', icon: 'lightbulb' },
];

const Analytics: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get('tab') as TabKey) || 'sales';
  const [activeTab, setActiveTab] = useState<TabKey>(
    (['sales', 'bi', 'suggestions'] as TabKey[]).includes(initialTab) ? initialTab : 'sales',
  );

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabKey;
    if (tabParam && (['sales', 'bi', 'suggestions'] as TabKey[]).includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  return (
    <PageLayout>
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {/* Tab Bar */}
        <div className="h-12 border-b border-[var(--erp-border)] bg-slate-50 flex items-center px-4 gap-1 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold uppercase tracking-wider rounded-t transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-[var(--erp-accent)] border border-[var(--erp-border)] border-b-white -mb-px'
                  : 'text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined !text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'sales' && <SalesReportsTab />}
          {activeTab === 'bi' && <BusinessIntelligenceTab />}
          {activeTab === 'suggestions' && <SuggestionsTab />}
        </div>
      </main>
    </PageLayout>
  );
};

// ============================================================================
// TAB 1: Sales Reports (existing content)
// ============================================================================

const SalesReportsTab: React.FC = () => {
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

  const analytics = useMemo(() => {
    const totalRfqs = rfqs.length;
    const pendingRfqs = rfqs.filter(r => r.status === 'pending').length;
    const quotedRfqs = rfqs.filter(r => r.status === 'quoted').length;
    const totalQuotes = quotes.length;
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
    const declinedQuotes = quotes.filter(q => q.status === 'declined').length;
    const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;
    const totalRevenue = quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + q.items.reduce((s, i) => s + i.total, 0), 0);
    const avgDealSize = acceptedQuotes > 0 ? Math.round(totalRevenue / acceptedQuotes) : 0;
    const emailRfqs = rfqs.filter(r => r.channel === 'email').length;
    const whatsappRfqs = rfqs.filter(r => r.channel === 'whatsapp').length;
    const manualRfqs = rfqs.filter(r => r.channel === 'manual').length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const topClients = clients.filter(c => c.tier === 'top').length;
    return { totalRfqs, pendingRfqs, quotedRfqs, totalQuotes, acceptedQuotes, declinedQuotes, conversionRate, totalRevenue, avgDealSize, emailRfqs, whatsappRfqs, manualRfqs, activeProducts, topClients, totalClients: clients.length, totalProducts: products.length };
  }, [rfqs, quotes, products, clients]);

  const handleExport = () => { downloadAnalyticsCsv(selectedReportId); showToast('Report exported successfully', 'success'); };
  const handlePrint = () => { showToast('Preparing print view...', 'info'); window.print(); };

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="w-72 border-r border-[var(--erp-border)] flex flex-col bg-white shrink-0">
        <div className="h-10 border-b border-[var(--erp-border)] bg-slate-50 flex items-center justify-between px-3 shrink-0">
          <h2 className="text-[11px] font-bold text-[var(--erp-text)] uppercase tracking-wider">Reports</h2>
          <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">{reports.length}</span>
        </div>
        <div className="p-2 border-b border-[var(--erp-border)]">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full text-[11px] border border-[var(--erp-border)] rounded px-2 py-1.5 bg-white">
            <option value="all">All Categories</option>
            <option value="sales">Sales</option>
            <option value="operations">Operations</option>
            <option value="products">Products</option>
            <option value="clients">Clients</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {reports.filter(r => categoryFilter === 'all' || r.category === categoryFilter).map(report => (
            <div key={report.id} onClick={() => setSelectedReportId(report.id)} className={`px-3 py-3 border-b border-[var(--erp-border)] cursor-pointer transition-colors ${selectedReportId === report.id ? 'bg-blue-50 border-l-[3px] border-l-[var(--erp-accent)]' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2.5">
                <span className={`material-symbols-outlined !text-[20px] ${selectedReportId === report.id ? 'text-[var(--erp-accent)]' : 'text-slate-400'}`}>{report.icon}</span>
                <div>
                  <p className="text-[12px] font-semibold text-[var(--erp-text)]">{report.name}</p>
                  <p className="text-[11px] text-[var(--erp-text-muted)]">{report.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="h-10 border-b border-[var(--erp-border)] bg-slate-50 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-[var(--erp-text-muted)]">Period:</label>
              <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="text-[12px] border border-[var(--erp-border)] rounded py-1 px-2 bg-white">
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="p-1.5 hover:bg-slate-200 rounded" title="Print"><span className="material-symbols-outlined !text-[18px] text-[var(--erp-text-muted)]">print</span></button>
            <button onClick={handleExport} className="p-1.5 hover:bg-slate-200 rounded" title="Export"><span className="material-symbols-outlined !text-[18px] text-[var(--erp-text-muted)]">download</span></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-6 flex justify-between items-end border-b border-[var(--erp-border)] pb-5">
            <div>
              <h1 className="text-xl font-bold text-[var(--erp-text)]">{selectedReport?.name}</h1>
              <p className="text-[11px] text-[var(--erp-text-muted)] mt-1 uppercase tracking-wider">Generated: {new Date().toLocaleDateString()} • Period: {periodFilter}</p>
            </div>
            <div className="flex gap-6 text-right">
              <div><p className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest">Total Revenue</p><p className="text-lg font-bold text-[var(--erp-text)]">₹{analytics.totalRevenue.toLocaleString()}</p></div>
              <div><p className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest">Avg. Deal</p><p className="text-lg font-bold text-[var(--erp-text)]">₹{analytics.avgDealSize.toLocaleString()}</p></div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total RFQs', value: analytics.totalRfqs, sub: `${analytics.pendingRfqs} pending`, icon: 'inbox', from: 'from-blue-50', to: 'to-blue-100', border: 'border-blue-200', text: 'text-blue-600', bold: 'text-blue-700' },
              { label: 'Quotes', value: analytics.totalQuotes, sub: `${analytics.acceptedQuotes} accepted`, icon: 'receipt_long', from: 'from-green-50', to: 'to-green-100', border: 'border-green-200', text: 'text-green-600', bold: 'text-green-700' },
              { label: 'Conversion', value: `${analytics.conversionRate}%`, sub: `${analytics.declinedQuotes} declined`, icon: 'percent', from: 'from-purple-50', to: 'to-purple-100', border: 'border-purple-200', text: 'text-purple-600', bold: 'text-purple-700' },
              { label: 'Clients', value: analytics.totalClients, sub: `${analytics.topClients} top tier`, icon: 'groups', from: 'from-amber-50', to: 'to-amber-100', border: 'border-amber-200', text: 'text-amber-600', bold: 'text-amber-700' },
            ].map((kpi) => (
              <div key={kpi.label} className={`bg-gradient-to-br ${kpi.from} ${kpi.to} p-4 rounded-lg border ${kpi.border}`}>
                <div className="flex items-center gap-2 mb-2"><span className={`material-symbols-outlined !text-[18px] ${kpi.text}`}>{kpi.icon}</span><span className={`text-[11px] font-bold ${kpi.text} uppercase`}>{kpi.label}</span></div>
                <p className={`text-2xl font-bold ${kpi.bold}`}>{kpi.value}</p>
                <p className={`text-[11px] ${kpi.text} mt-1`}>{kpi.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-[var(--erp-border)]"><h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">RFQ by Channel</h3></div>
              <div className="p-4 space-y-3">
                {[{ label: 'Email', value: analytics.emailRfqs, color: 'bg-blue-500' }, { label: 'WhatsApp', value: analytics.whatsappRfqs, color: 'bg-green-500' }, { label: 'Manual', value: analytics.manualRfqs, color: 'bg-slate-400' }].map(ch => {
                  const pct = analytics.totalRfqs > 0 ? Math.round((ch.value / analytics.totalRfqs) * 100) : 0;
                  return (<div key={ch.label}><div className="flex justify-between text-[12px] mb-1"><span className="text-[var(--erp-text)]">{ch.label}</span><span className="font-medium">{ch.value} ({pct}%)</span></div><div className="w-full bg-slate-100 h-2.5 rounded overflow-hidden"><div className={`${ch.color} h-full rounded transition-all`} style={{ width: `${pct}%` }}></div></div></div>);
                })}
              </div>
            </div>
            <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-[var(--erp-border)]"><h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Quote Status Distribution</h3></div>
              <div className="p-4 flex items-center gap-6">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 36 36" className="w-full h-full"><circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#e2e8f0" strokeWidth="3"></circle><circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#10b981" strokeWidth="3" strokeDasharray={`${analytics.conversionRate} ${100 - analytics.conversionRate}`} strokeDashoffset="25"></circle></svg>
                  <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl font-bold text-[var(--erp-text)]">{analytics.conversionRate}%</span></div>
                </div>
                <div className="space-y-2 text-[12px]">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded"></span><span>Accepted: {analytics.acceptedQuotes}</span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded"></span><span>Declined: {analytics.declinedQuotes}</span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded"></span><span>Pending: {analytics.totalQuotes - analytics.acceptedQuotes - analytics.declinedQuotes}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Detailed Breakdown</h3>
              <button onClick={handleExport} className="text-[11px] text-[var(--erp-accent)] font-medium hover:underline">Export CSV →</button>
            </div>
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50 text-[10px] text-[var(--erp-text-muted)] uppercase tracking-wider"><tr><th className="px-4 py-2 text-left">Metric</th><th className="px-4 py-2 text-right">Count</th><th className="px-4 py-2 text-right">Percentage</th><th className="px-4 py-2 text-left">Trend</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { metric: 'Total RFQs Received', count: analytics.totalRfqs, pct: 100, trend: 'up' as const },
                  { metric: 'RFQs Converted to Quotes', count: analytics.quotedRfqs, pct: analytics.totalRfqs > 0 ? Math.round((analytics.quotedRfqs / analytics.totalRfqs) * 100) : 0, trend: 'up' as const },
                  { metric: 'Quotes Accepted', count: analytics.acceptedQuotes, pct: analytics.conversionRate, trend: 'up' as const },
                  { metric: 'Quotes Declined', count: analytics.declinedQuotes, pct: analytics.totalQuotes > 0 ? Math.round((analytics.declinedQuotes / analytics.totalQuotes) * 100) : 0, trend: 'down' as const },
                  { metric: 'Active Products', count: analytics.activeProducts, pct: analytics.totalProducts > 0 ? Math.round((analytics.activeProducts / analytics.totalProducts) * 100) : 0, trend: 'stable' as const },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium">{row.metric}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{row.count}</td>
                    <td className="px-4 py-2.5 text-right">{row.pct}%</td>
                    <td className="px-4 py-2.5">
                      <span className={`material-symbols-outlined !text-[16px] ${row.trend === 'up' ? 'text-green-500' : row.trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}>
                        {row.trend === 'up' ? 'trending_up' : row.trend === 'down' ? 'trending_down' : 'trending_flat'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TAB 2: Business Intelligence
// ============================================================================

const BusinessIntelligenceTab: React.FC = () => {
  const { showToast } = useApp();
  const [funnel, setFunnel] = useState<{ stages: FunnelStage[] } | null>(null);
  const [forecast, setForecast] = useState<RevenueForecast | null>(null);
  const [clientInsights, setClientInsights] = useState<{ topClients: ClientInsight[] } | null>(null);
  const [productPerf, setProductPerf] = useState<{ products: ProductPerf[] } | null>(null);
  const [aiMetrics, setAiMetrics] = useState<AIPipelineMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientSort, setClientSort] = useState<{ field: keyof ClientInsight; dir: 'asc' | 'desc' }>({ field: 'revenue', dir: 'desc' });
  const [productSort, setProductSort] = useState<{ field: keyof ProductPerf; dir: 'asc' | 'desc' }>({ field: 'quoteCount', dir: 'desc' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [f, fc, ci, pp, ai] = await Promise.all([
          apiRequest<{ stages: FunnelStage[] }>('/analytics/conversion-funnel'),
          apiRequest<RevenueForecast>('/analytics/revenue-forecast'),
          apiRequest<{ topClients: ClientInsight[] }>('/analytics/client-insights-enhanced?limit=10'),
          apiRequest<{ products: ProductPerf[] }>('/analytics/product-performance-enhanced?limit=10'),
          apiRequest<AIPipelineMetrics>('/analytics/ai-metrics'),
        ]);
        setFunnel(f); setForecast(fc); setClientInsights(ci); setProductPerf(pp); setAiMetrics(ai);
      } catch (err: any) { showToast(err.message || 'Failed to load analytics', 'error'); }
      finally { setLoading(false); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedClients = useMemo(() => {
    if (!clientInsights?.topClients) return [];
    return [...clientInsights.topClients].sort((a, b) => {
      const aVal = a[clientSort.field] ?? 0; const bVal = b[clientSort.field] ?? 0;
      return clientSort.dir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [clientInsights, clientSort]);

  const sortedProducts = useMemo(() => {
    if (!productPerf?.products) return [];
    return [...productPerf.products].sort((a, b) => {
      const aVal = a[productSort.field] ?? 0; const bVal = b[productSort.field] ?? 0;
      return productSort.dir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [productPerf, productSort]);

  const handleClientSort = (field: keyof ClientInsight) => { setClientSort(prev => ({ field, dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc' })); };
  const handleProductSort = (field: keyof ProductPerf) => { setProductSort(prev => ({ field, dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc' })); };

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="text-center"><span className="material-symbols-outlined !text-[40px] text-[var(--erp-accent)] animate-spin">progress_activity</span><p className="text-[12px] text-[var(--erp-text-muted)] mt-2">Loading analytics...</p></div>
    </div>
  );

  const maxFunnelCount = funnel?.stages?.[0]?.count || 1;
  const maxTrendValue = Math.max(...(forecast?.monthlyTrend?.map(m => Math.max(m.actual || 0, m.projected || 0)) || [1]));
  const funnelColors = ['bg-[var(--erp-accent)]', 'bg-[#007ea7]/80', 'bg-[#007ea7]/60', 'bg-[#007ea7]/40', 'bg-[#007ea7]/25'];

  const getMetricColor = (value: number) => {
    if (value >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (value >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="p-5 space-y-6">
      {/* Conversion Funnel */}
      <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-[var(--erp-border)]"><h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-wider">Conversion Funnel</h3></div>
        <div className="p-4">
          <div className="flex items-end gap-3">
            {funnel?.stages?.map((stage, i) => {
              const widthPct = maxFunnelCount > 0 ? Math.max((stage.count / maxFunnelCount) * 100, 8) : 8;
              return (
                <div key={stage.name} className="flex-1 text-center">
                  <p className="text-2xl font-bold text-[var(--erp-text)]">{stage.count}</p>
                  <div className="mt-1 mx-auto rounded overflow-hidden" style={{ height: '32px', width: `${widthPct}%`, minWidth: '40px' }}>
                    <div className={`h-full w-full ${funnelColors[i] || funnelColors[4]} rounded`} />
                  </div>
                  <p className="text-[11px] font-semibold text-[var(--erp-text)] mt-2">{stage.name}</p>
                  <p className="text-[10px] text-[var(--erp-text-muted)]">{i === 0 ? '100%' : `${Math.round(stage.rate)}%`}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Revenue Forecast */}
      <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-[var(--erp-border)]"><h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-wider">Revenue Forecast</h3></div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 text-center"><p className="text-[11px] font-bold text-blue-600 uppercase">Pipeline Value</p><p className="text-2xl font-bold text-blue-700 mt-1">₹{(forecast?.pipelineValue || 0).toLocaleString()}</p></div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 text-center"><p className="text-[11px] font-bold text-purple-600 uppercase">Conversion Rate</p><p className="text-2xl font-bold text-purple-700 mt-1">{forecast?.conversionRate || 0}%</p></div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 text-center"><p className="text-[11px] font-bold text-green-600 uppercase">Projected Revenue</p><p className="text-2xl font-bold text-green-700 mt-1">₹{(forecast?.projectedRevenue || 0).toLocaleString()}</p></div>
          </div>
          <div className="flex items-end gap-2" style={{ height: '160px' }}>
            {forecast?.monthlyTrend?.map((m) => {
              const value = m.actual ?? m.projected ?? 0;
              const heightPct = maxTrendValue > 0 ? Math.max((value / maxTrendValue) * 100, 2) : 2;
              const isProjected = m.projected !== undefined && m.actual === undefined;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full">
                  <p className="text-[9px] font-mono text-[var(--erp-text-muted)] mb-1">₹{Math.round(value / 1000)}k</p>
                  <div className={`w-full max-w-[40px] rounded-t transition-all ${isProjected ? 'bg-[#007ea7]/20 border-2 border-dashed border-[#007ea7]/40' : 'bg-[var(--erp-accent)]'}`} style={{ height: `${heightPct}%` }} />
                  <p className="text-[9px] text-[var(--erp-text-muted)] mt-1">{m.month.slice(5)}</p>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[var(--erp-accent)] rounded"></span> Actual</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#007ea7]/20 border-2 border-dashed border-[#007ea7]/40 rounded"></span> Projected</span>
          </div>
        </div>
      </div>

      {/* Client Insights Table */}
      <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-[var(--erp-border)]"><h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-wider">Top Clients</h3></div>
        <table className="w-full text-[12px]">
          <thead className="bg-slate-50 text-[10px] text-[var(--erp-text-muted)] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2 text-left w-10">#</th>
              <th className="px-4 py-2 text-left cursor-pointer hover:text-[var(--erp-accent)]" onClick={() => handleClientSort('name')}>Client Name {clientSort.field === 'name' && (clientSort.dir === 'asc' ? '▲' : '▼')}</th>
              <th className="px-4 py-2 text-right cursor-pointer hover:text-[var(--erp-accent)]" onClick={() => handleClientSort('revenue')}>Revenue (₹) {clientSort.field === 'revenue' && (clientSort.dir === 'asc' ? '▲' : '▼')}</th>
              <th className="px-4 py-2 text-right cursor-pointer hover:text-[var(--erp-accent)]" onClick={() => handleClientSort('acceptanceRate')}>Acceptance (%) {clientSort.field === 'acceptanceRate' && (clientSort.dir === 'asc' ? '▲' : '▼')}</th>
              <th className="px-4 py-2 text-right cursor-pointer hover:text-[var(--erp-accent)]" onClick={() => handleClientSort('avgResponseDays')}>Avg Response (days) {clientSort.field === 'avgResponseDays' && (clientSort.dir === 'asc' ? '▲' : '▼')}</th>
              <th className="px-4 py-2 text-right cursor-pointer hover:text-[var(--erp-accent)]" onClick={() => handleClientSort('growth')}>Growth {clientSort.field === 'growth' && (clientSort.dir === 'asc' ? '▲' : '▼')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedClients.map((c, i) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-[var(--erp-text-muted)]">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium">{c.name}</td>
                <td className="px-4 py-2.5 text-right font-mono">₹{c.revenue.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right">{c.acceptanceRate}%</td>
                <td className="px-4 py-2.5 text-right">{c.avgResponseDays !== null ? c.avgResponseDays : '—'}</td>
                <td className="px-4 py-2.5 text-right"><span className={c.growth >= 0 ? 'text-green-600' : 'text-red-600'}>{c.growth >= 0 ? '▲' : '▼'} {Math.abs(c.growth)}%</span></td>
              </tr>
            ))}
            {sortedClients.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-[12px]">No client data available</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Product Performance Table */}
      <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-[var(--erp-border)]"><h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-wider">Product Performance</h3></div>
        <table className="w-full text-[12px]">
          <thead className="bg-slate-50 text-[10px] text-[var(--erp-text-muted)] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2 text-left w-10">#</th>
              <th className="px-4 py-2 text-left cursor-pointer hover:text-[var(--erp-accent)]" onClick={() => handleProductSort('name')}>Product {productSort.field === 'name' && (productSort.dir === 'asc' ? '▲' : '▼')}</th>
              <th className="px-4 py-2 text-left">SKU</th>
              <th className="px-4 py-2 text-right cursor-pointer hover:text-[var(--erp-accent)]" onClick={() => handleProductSort('quoteCount')}>Quote Count {productSort.field === 'quoteCount' && (productSort.dir === 'asc' ? '▲' : '▼')}</th>
              <th className="px-4 py-2 text-right cursor-pointer hover:text-[var(--erp-accent)]" onClick={() => handleProductSort('revenue')}>Revenue (₹) {productSort.field === 'revenue' && (productSort.dir === 'asc' ? '▲' : '▼')}</th>
              <th className="px-4 py-2 text-right cursor-pointer hover:text-[var(--erp-accent)]" onClick={() => handleProductSort('marginPercent')}>Margin (%) {productSort.field === 'marginPercent' && (productSort.dir === 'asc' ? '▲' : '▼')}</th>
              <th className="px-4 py-2 text-right cursor-pointer hover:text-[var(--erp-accent)]" onClick={() => handleProductSort('avgUnitPrice')}>Avg Unit Price (₹) {productSort.field === 'avgUnitPrice' && (productSort.dir === 'asc' ? '▲' : '▼')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedProducts.map((p, i) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-[var(--erp-text-muted)]">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium">{p.name}</td>
                <td className="px-4 py-2.5 text-[var(--erp-text-muted)] font-mono">{p.sku}</td>
                <td className="px-4 py-2.5 text-right font-mono">{p.quoteCount}</td>
                <td className="px-4 py-2.5 text-right font-mono">₹{p.revenue.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right">{p.marginPercent}%</td>
                <td className="px-4 py-2.5 text-right font-mono">₹{p.avgUnitPrice.toLocaleString()}</td>
              </tr>
            ))}
            {sortedProducts.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-[12px]">No product data available</td></tr>}
          </tbody>
        </table>
      </div>

      {/* AI Pipeline Metrics */}
      <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-[var(--erp-border)]"><h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-wider">AI Pipeline Metrics</h3></div>
        <div className="p-4 grid grid-cols-4 gap-4">
          {[
            { label: 'Parse Success Rate', value: aiMetrics?.parseSuccessRate ?? 0, suffix: '%', icon: 'check_circle', isCount: false },
            { label: 'Auto-Quote Rate', value: aiMetrics?.autoQuoteRate ?? 0, suffix: '%', icon: 'bolt', isCount: false },
            { label: 'Avg Confidence', value: aiMetrics?.avgConfidence ?? 0, suffix: '', icon: 'psychology', isCount: false },
            { label: 'Total Parse Runs', value: aiMetrics?.totalParseRuns ?? 0, suffix: '', icon: 'data_object', isCount: true },
          ].map((m) => {
            const colorClass = m.isCount ? 'text-[var(--erp-accent)] bg-blue-50 border-blue-200' : getMetricColor(m.value);
            return (
              <div key={m.label} className={`p-4 rounded-lg border text-center ${colorClass}`}>
                <span className="material-symbols-outlined !text-[24px] mb-1">{m.icon}</span>
                <p className="text-2xl font-bold mt-1">{m.isCount ? m.value.toLocaleString() : `${m.value}${m.suffix}`}</p>
                <p className="text-[11px] font-semibold uppercase mt-1">{m.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TAB 3: Suggestions
// ============================================================================

const SuggestionsTab: React.FC = () => {
  const { showToast } = useApp();
  const [followUps, setFollowUps] = useState<FollowUps | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('staleQuotes');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try { const data = await apiRequest<FollowUps>('/suggestions/follow-ups'); setFollowUps(data); }
      catch (err: any) { showToast(err.message || 'Failed to load suggestions', 'error'); }
      finally { setLoading(false); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSection = useCallback((section: string) => { setExpandedSection(prev => prev === section ? null : section); }, []);

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="text-center"><span className="material-symbols-outlined !text-[40px] text-[var(--erp-accent)] animate-spin">progress_activity</span><p className="text-[12px] text-[var(--erp-text-muted)] mt-2">Loading suggestions...</p></div>
    </div>
  );

  const staleCount = followUps?.staleQuotes?.length ?? 0;
  const overdueCount = followUps?.overdueInvoices?.length ?? 0;
  const inactiveCount = followUps?.inactiveClients?.length ?? 0;

  return (
    <div className="p-5 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'staleQuotes', count: staleCount, label: 'Stale Quotes', icon: 'schedule' },
          { key: 'overdueInvoices', count: overdueCount, label: 'Overdue Invoices', icon: 'warning' },
          { key: 'inactiveClients', count: inactiveCount, label: 'Inactive Clients', icon: 'person_off' },
        ].map((card) => (
          <div key={card.key} onClick={() => toggleSection(card.key)} className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${card.count > 5 ? 'bg-red-50 border-red-200' : card.count > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'} ${expandedSection === card.key ? 'ring-2 ring-[var(--erp-accent)]' : ''}`}>
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined !text-[28px] ${card.count > 5 ? 'text-red-500' : card.count > 0 ? 'text-amber-500' : 'text-green-500'}`}>{card.icon}</span>
              <div><p className="text-2xl font-bold text-[var(--erp-text)]">{card.count}</p><p className="text-[11px] font-bold uppercase text-[var(--erp-text-muted)]">{card.label}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Stale Quotes */}
      {expandedSection === 'staleQuotes' && (
        <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-wider">Stale Quotes — Awaiting Response</h3>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">{staleCount} ITEMS</span>
          </div>
          {staleCount > 0 ? (
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50 text-[10px] text-[var(--erp-text-muted)] uppercase tracking-wider"><tr><th className="px-4 py-2 text-left">Client</th><th className="px-4 py-2 text-left">Quote #</th><th className="px-4 py-2 text-right">Total (₹)</th><th className="px-4 py-2 text-right">Days Since Sent</th><th className="px-4 py-2 text-center">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {followUps?.staleQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium">{q.clientName}</td>
                    <td className="px-4 py-2.5 text-[var(--erp-accent)] font-mono">{q.number}</td>
                    <td className="px-4 py-2.5 text-right font-mono">₹{q.total.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right"><span className={q.daysSinceSent > 7 ? 'text-red-600 font-bold' : 'text-amber-600'}>{q.daysSinceSent}d</span></td>
                    <td className="px-4 py-2.5 text-center"><button onClick={() => showToast('Reminder feature coming soon', 'info')} className="btn btn-sm btn-primary">Send Reminder</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center"><span className="material-symbols-outlined !text-[32px] text-green-400 mb-2">check_circle</span><p className="text-[12px] text-slate-400">No stale quotes — all caught up!</p></div>
          )}
        </div>
      )}

      {/* Overdue Invoices */}
      {expandedSection === 'overdueInvoices' && (
        <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-wider">Overdue Invoices</h3>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">{overdueCount} ITEMS</span>
          </div>
          {overdueCount > 0 ? (
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50 text-[10px] text-[var(--erp-text-muted)] uppercase tracking-wider"><tr><th className="px-4 py-2 text-left">Client</th><th className="px-4 py-2 text-left">Invoice #</th><th className="px-4 py-2 text-right">Amount Due (₹)</th><th className="px-4 py-2 text-right">Days Overdue</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {followUps?.overdueInvoices.map((inv) => (
                  <tr key={inv.id} className={`hover:bg-slate-50 ${inv.daysOverdue > 30 ? 'bg-red-50/50' : 'bg-amber-50/30'}`}>
                    <td className="px-4 py-2.5 font-medium">{inv.clientName}</td>
                    <td className="px-4 py-2.5 text-[var(--erp-accent)] font-mono">{inv.number}</td>
                    <td className="px-4 py-2.5 text-right font-mono">₹{inv.amountDue.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${inv.daysOverdue > 30 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>{inv.daysOverdue}d OVERDUE</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center"><span className="material-symbols-outlined !text-[32px] text-green-400 mb-2">check_circle</span><p className="text-[12px] text-slate-400">No overdue invoices!</p></div>
          )}
        </div>
      )}

      {/* Inactive Clients */}
      {expandedSection === 'inactiveClients' && (
        <div className="bg-white border border-[var(--erp-border)] rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-wider">Inactive Clients (30+ days)</h3>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{inactiveCount} CLIENTS</span>
          </div>
          {inactiveCount > 0 ? (
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50 text-[10px] text-[var(--erp-text-muted)] uppercase tracking-wider"><tr><th className="px-4 py-2 text-left">Client Name</th><th className="px-4 py-2 text-left">Last Activity</th><th className="px-4 py-2 text-right">Historical Value (₹)</th><th className="px-4 py-2 text-center">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {followUps?.inactiveClients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium">{c.name}</td>
                    <td className="px-4 py-2.5 text-[var(--erp-text-muted)]">{c.lastActivityDate ? new Date(c.lastActivityDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No activity'}</td>
                    <td className="px-4 py-2.5 text-right font-mono">₹{c.totalHistoricalValue.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center"><button onClick={() => showToast('Contact feature coming soon', 'info')} className="btn btn-sm btn-secondary">Contact</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center"><span className="material-symbols-outlined !text-[32px] text-green-400 mb-2">check_circle</span><p className="text-[12px] text-slate-400">All clients are active!</p></div>
          )}
        </div>
      )}
    </div>
  );
};

export default Analytics;
