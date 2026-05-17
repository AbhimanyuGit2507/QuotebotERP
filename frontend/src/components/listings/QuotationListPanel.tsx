import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

// Dummy data for Quotations
const quotationData = {
  categories: [
    {
      name: 'Draft',
      items: [
        { id: 'QT-2024-0012', client: 'Global Logistics Solutions', date: '02-Jan-2024', amount: 45750.00, status: 'Draft' },
        { id: 'QT-2024-0011', client: 'Metro Engineering Works', date: '01-Jan-2024', amount: 23100.00, status: 'Draft' },
      ]
    },
    {
      name: 'Sent - Awaiting Response',
      items: [
        { id: 'QT-2023-0089', client: 'Tech-Corp International Inc.', date: '28-Dec-2023', amount: 67890.00, status: 'Sent' },
        { id: 'QT-2023-0087', client: 'Pacific Trading Co.', date: '26-Dec-2023', amount: 34500.00, status: 'Sent' },
        { id: 'QT-2023-0085', client: 'Northern Supply Chain', date: '24-Dec-2023', amount: 89200.00, status: 'Sent' },
      ]
    },
    {
      name: 'Accepted',
      items: [
        { id: 'QT-2023-0082', client: 'Swift Manufacturing', date: '20-Dec-2023', amount: 156780.00, status: 'Accepted' },
        { id: 'QT-2023-0078', client: 'Delta Enterprises', date: '18-Dec-2023', amount: 42300.00, status: 'Accepted' },
      ]
    },
    {
      name: 'Expired',
      items: [
        { id: 'QT-2023-0065', client: 'Old Client Corp', date: '01-Dec-2023', amount: 28400.00, status: 'Expired' },
      ]
    }
  ],
  totalCount: 156
};

interface QuotationItem {
  id: string;
  client: string;
  date: string;
  amount: number;
  status: string;
}

interface QuotationListPanelProps {
  onItemSelect?: (item: QuotationItem) => void;
  selectedId?: string;
}

const QuotationListPanel: React.FC<QuotationListPanelProps> = ({ onItemSelect, selectedId }) => {
  const { showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'Draft' | 'Sent' | 'Accepted' | 'Expired'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'client' | 'amount' | 'id'>('date');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

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

  const parseDate = (dateStr: string): Date => {
    return new Date(dateStr);
  };

  const sortItems = (items: QuotationItem[]): QuotationItem[] => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return parseDate(b.date).getTime() - parseDate(a.date).getTime();
        case 'client':
          return a.client.localeCompare(b.client);
        case 'amount':
          return b.amount - a.amount;
        case 'id':
          return b.id.localeCompare(a.id);
        default:
          return 0;
      }
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Sent': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Accepted': return 'bg-green-100 text-green-700 border-green-200';
      case 'Expired': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const filteredCategories = quotationData.categories.map(category => ({
    ...category,
    items: sortItems(category.items.filter(item => {
      const matchesSearch = item.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      return matchesSearch && matchesStatus;
    }))
  })).filter(category => category.items.length > 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 2 
    }).format(amount);
  };

  return (
    <div className="w-[400px] bg-white border-r border-[var(--erp-border)] flex flex-col shrink-0">
      {/* Header with Search and Filters */}
      <div className="p-4 bg-slate-50 border-b border-[var(--erp-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--erp-text-muted)]">Quotations</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                className={`p-1.5 hover:bg-slate-200 rounded transition-colors ${showFilterDropdown ? 'bg-slate-200' : ''}`}
                title="Filter"
                onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowSortDropdown(false); }}
              >
                <span className="material-symbols-outlined text-[var(--erp-text-muted)] !text-base">filter_list</span>
              </button>
              {showFilterDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-[var(--erp-border)] rounded shadow-lg z-10 min-w-[140px]">
                  <div className="p-2 text-[11px] font-bold text-[var(--erp-text-muted)] uppercase border-b border-[var(--erp-border)]">Filter by Status</div>
                  {['all', 'Draft', 'Sent', 'Accepted', 'Expired'].map(status => (
                    <button
                      key={status}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 ${filterStatus === status ? 'bg-slate-100 text-[var(--erp-accent)]' : ''}`}
                      onClick={() => { setFilterStatus(status as typeof filterStatus); setShowFilterDropdown(false); }}
                    >
                      {status === 'all' ? 'All Statuses' : status}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button 
                className={`p-1.5 hover:bg-slate-200 rounded transition-colors ${showSortDropdown ? 'bg-slate-200' : ''}`}
                title="Sort"
                onClick={() => { setShowSortDropdown(!showSortDropdown); setShowFilterDropdown(false); }}
              >
                <span className="material-symbols-outlined text-[var(--erp-text-muted)] !text-base">sort</span>
              </button>
              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-[var(--erp-border)] rounded shadow-lg z-10 min-w-[140px]">
                  <div className="p-2 text-[11px] font-bold text-[var(--erp-text-muted)] uppercase border-b border-[var(--erp-border)]">Sort by</div>
                  {[
                    { value: 'date', label: 'Date' },
                    { value: 'client', label: 'Client Name' },
                    { value: 'amount', label: 'Amount' },
                    { value: 'id', label: 'Quotation ID' }
                  ].map(option => (
                    <button
                      key={option.value}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 ${sortBy === option.value ? 'bg-slate-100 text-[var(--erp-accent)]' : ''}`}
                      onClick={() => { setSortBy(option.value as typeof sortBy); setShowSortDropdown(false); }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400 !text-base">search</span>
          </span>
          <input 
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-[var(--erp-border)] rounded focus:ring-1 focus:ring-[var(--erp-accent)] focus:border-[var(--erp-accent)] outline-none" 
            placeholder="Search Quotation or Client..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[13px] text-[var(--erp-text-muted)]">
          <span>Total: {quotationData.totalCount}</span>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredCategories.map((category, catIdx) => (
          <div key={catIdx}>
            {/* Category Header */}
            <div 
              className="px-4 py-2.5 text-[13px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest bg-slate-50 border-b border-[var(--erp-border)] sticky top-0 flex items-center justify-between cursor-pointer hover:bg-slate-100"
              onClick={() => toggleCategory(category.name)}
            >
              <div className="flex items-center gap-2">
                <span 
                  className="material-symbols-outlined !text-base transition-transform duration-200"
                  style={{ transform: collapsedCategories.has(category.name) ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                >
                  expand_more
                </span>
                <span>{category.name}</span>
              </div>
              <span className="text-[12px] font-medium bg-slate-200 px-1.5 rounded">{category.items.length}</span>
            </div>
            {/* Category Items */}
            {!collapsedCategories.has(category.name) && category.items.map((item, idx) => {
              const isSelected = selectedId === item.id || (!selectedId && catIdx === 0 && idx === 0);
              return (
                <div 
                  key={item.id} 
                  className={`p-4 border-b border-[var(--erp-border)] cursor-pointer transition-colors
                    ${isSelected ? 'bg-slate-100 border-l-4 border-l-[var(--erp-accent)]' : 'hover:bg-slate-50'}`}
                  onClick={() => onItemSelect?.(item)}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className={`text-[13px] font-bold uppercase ${isSelected ? 'text-[var(--erp-accent)]' : 'text-[var(--erp-text-muted)]'}`}>
                      {item.id}
                    </span>
                    <span className={`text-[9px] px-1.5 border uppercase font-bold ${getStatusBadgeColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-[var(--erp-text)] truncate">{item.client}</div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[13px] text-[var(--erp-text-muted)]">{item.date}</span>
                    <span className="text-[13px] font-medium text-slate-600">{formatCurrency(item.amount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Add New Button */}
      <div className="p-3 bg-slate-50 border-t border-[var(--erp-border)]">
        <button className="btn btn-primary btn-block btn-lg" onClick={() => showToast('Quotation creation modal coming soon!', 'info')}>
          <span className="material-symbols-outlined !text-base">add_circle</span>
          NEW QUOTATION
        </button>
      </div>
    </div>
  );
};

export default QuotationListPanel;
