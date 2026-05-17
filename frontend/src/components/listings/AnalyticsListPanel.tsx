import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface ReportItem {
  id: string;
  name: string;
  icon: string;
  category: string;
  lastRun?: string;
}

// Dummy data for Reports
const reportData = {
  categories: [
    {
      name: 'Sales Analytics',
      items: [
        { id: 'RPT-001', name: 'Product Sales Trends', icon: 'trending_up', category: 'Sales Analytics', lastRun: 'Today' },
        { id: 'RPT-002', name: 'Customer Acquisition', icon: 'group', category: 'Sales Analytics', lastRun: 'Yesterday' },
        { id: 'RPT-003', name: 'Quote Conversion Rates', icon: 'request_quote', category: 'Sales Analytics', lastRun: '3 days ago' },
        { id: 'RPT-004', name: 'Regional Performance', icon: 'map', category: 'Sales Analytics' },
      ]
    },
    {
      name: 'Financial Reports',
      items: [
        { id: 'RPT-005', name: 'Revenue Recognition', icon: 'payments', category: 'Financial Reports', lastRun: 'Last week' },
        { id: 'RPT-006', name: 'Profit & Loss Summary', icon: 'account_balance_wallet', category: 'Financial Reports' },
        { id: 'RPT-007', name: 'Cash Flow Analysis', icon: 'currency_exchange', category: 'Financial Reports' },
      ]
    },
    {
      name: 'Inventory Reports',
      items: [
        { id: 'RPT-008', name: 'Stock Movement', icon: 'inventory_2', category: 'Inventory Reports' },
        { id: 'RPT-009', name: 'Reorder Alerts', icon: 'notification_important', category: 'Inventory Reports' },
      ]
    }
  ],
  totalCount: 9
};

interface AnalyticsListPanelProps {
  onItemSelect?: (item: ReportItem) => void;
  selectedId?: string;
}

const AnalyticsListPanel: React.FC<AnalyticsListPanelProps> = ({ onItemSelect, selectedId }) => {
  const { showToast } = useApp();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const toggleCategory = (categoryName: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const filteredCategories = reportData.categories
    .filter(cat => filterCategory === 'all' || cat.name === filterCategory)
    .map(category => ({
      ...category,
      items: category.items
    }));

  const allCategories = reportData.categories.map(c => c.name);

  return (
    <div className="w-[320px] bg-white border-r border-[var(--erp-border)] flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-[var(--erp-border)]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--erp-text-muted)]">Reports</h2>
          <div className="flex items-center gap-1 relative">
            <button 
              className={`p-1.5 rounded transition-colors ${showFilterDropdown ? 'bg-slate-200' : 'hover:bg-slate-200'}`}
              title="Filter"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <span className="material-symbols-outlined text-[var(--erp-text-muted)] !text-base">filter_list</span>
            </button>
            {showFilterDropdown && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-[var(--erp-border)] rounded shadow-lg z-10">
                <div className="p-2 border-b border-[var(--erp-border)] text-[11px] font-bold uppercase text-[var(--erp-text-muted)]">
                  Filter by Category
                </div>
                <div className="p-1">
                  <button 
                    className={`w-full text-left px-3 py-1.5 text-sm rounded ${filterCategory === 'all' ? 'bg-blue-50 text-[var(--erp-accent)]' : 'hover:bg-slate-50'}`}
                    onClick={() => { setFilterCategory('all'); setShowFilterDropdown(false); }}
                  >
                    All Reports
                  </button>
                  {allCategories.map(cat => (
                    <button 
                      key={cat}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded ${filterCategory === cat ? 'bg-blue-50 text-[var(--erp-accent)]' : 'hover:bg-slate-50'}`}
                      onClick={() => { setFilterCategory(cat); setShowFilterDropdown(false); }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="text-[13px] text-[var(--erp-text-muted)]">
          {reportData.totalCount} reports available
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredCategories.map((category) => (
          <div key={category.name}>
            {/* Collapsible Category Header */}
            <button 
              className="w-full px-4 py-2.5 text-[13px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest bg-slate-50 border-b border-[var(--erp-border)] flex items-center justify-between hover:bg-slate-100 transition-colors"
              onClick={() => toggleCategory(category.name)}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined !text-sm transition-transform" style={{ transform: collapsedCategories.has(category.name) ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                  expand_more
                </span>
                {category.name}
              </span>
              <span className="text-[12px] font-medium bg-slate-200 px-1.5 rounded">{category.items.length}</span>
            </button>
            {/* Category Items */}
            {!collapsedCategories.has(category.name) && category.items.map((item) => {
              const isSelected = selectedId === item.id || (!selectedId && item.id === 'RPT-001');
              return (
                <button
                  key={item.id}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors
                    ${isSelected 
                      ? 'text-[var(--erp-accent)] bg-blue-50 border-r-4 border-[var(--erp-accent)] font-medium' 
                      : 'text-[var(--erp-text-muted)] hover:bg-slate-50'}`}
                  onClick={() => onItemSelect?.(item)}
                >
                  <span className={`material-symbols-outlined !text-lg ${isSelected ? '!text-[var(--erp-accent)]' : ''}`}>
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{item.name}</div>
                    {item.lastRun && (
                      <div className="text-[11px] text-slate-400 mt-0.5">Last run: {item.lastRun}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50 border-t border-[var(--erp-border)]">
        <button className="btn btn-primary btn-block btn-lg" onClick={() => showToast('Analytics creation modal coming soon!', 'info')}>
          <span className="material-symbols-outlined !text-base">add_chart</span>
          CUSTOM REPORT
        </button>
      </div>
    </div>
  );
};

export default AnalyticsListPanel;
