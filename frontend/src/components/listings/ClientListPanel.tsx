import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface ClientItem {
  name: string;
  id: string;
  balance: number;
  type: 'CR' | 'DR';
}

// Dummy data for Clients
const clientData: { categories: { name: string; items: ClientItem[] }[]; totalCount: number } = {
  categories: [
    {
      name: 'Most Active',
      items: [
        { name: 'Global Logistics Solutions Ltd', id: 'ACC-2019-A', balance: 245000.00, type: 'CR' },
        { name: 'Tech-Corp International Inc.', id: 'ACC-2020-B', balance: 18750.00, type: 'DR' },
        { name: 'Swift Manufacturing Unit 4', id: 'ACC-2018-C', balance: 567800.00, type: 'CR' },
      ]
    },
    {
      name: 'Standard Accounts',
      items: [
        { name: 'Pacific Trading Co.', id: 'ACC-2021-D', balance: 42300.00, type: 'CR' },
        { name: 'Metro Engineering Works', id: 'ACC-2022-E', balance: 8950.00, type: 'DR' },
        { name: 'Northern Supply Chain', id: 'ACC-2020-F', balance: 134500.00, type: 'CR' },
        { name: 'Delta Enterprises Pvt Ltd', id: 'ACC-2019-G', balance: 67200.00, type: 'CR' },
        { name: 'Eastern Distribution Hub', id: 'ACC-2023-H', balance: 3200.00, type: 'DR' },
      ]
    },
    {
      name: 'Inactive',
      items: [
        { name: 'Old Client Corporation', id: 'ACC-2015-X', balance: 0.00, type: 'CR' },
        { name: 'Defunct Supplies Ltd', id: 'ACC-2016-Y', balance: 12400.00, type: 'DR' },
      ]
    }
  ],
  totalCount: 154
};

interface ClientListPanelProps {
  onItemSelect?: (item: ClientItem) => void;
  selectedId?: string;
}

const ClientListPanel: React.FC<ClientListPanelProps> = ({ onItemSelect, selectedId }) => {
  const { showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'CR' | 'DR'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'id'>('name');
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

  const sortItems = (items: ClientItem[]): ClientItem[] => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'balance':
          return b.balance - a.balance;
        case 'id':
          return a.id.localeCompare(b.id);
        default:
          return 0;
      }
    });
  };

  const filteredCategories = clientData.categories.map(category => ({
    ...category,
    items: sortItems(category.items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesType;
    }))
  })).filter(category => category.items.length > 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="w-[400px] bg-white border-r border-[var(--erp-border)] flex flex-col shrink-0">
      {/* Header with Search and Filters */}
      <div className="p-4 bg-slate-50 border-b border-[var(--erp-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--erp-text-muted)]">Client Directory</h2>
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
                  <div className="p-2 text-[11px] font-bold text-[var(--erp-text-muted)] uppercase border-b border-[var(--erp-border)]">Filter by Type</div>
                  {[
                    { value: 'all', label: 'All Types' },
                    { value: 'CR', label: 'Credit (CR)' },
                    { value: 'DR', label: 'Debit (DR)' }
                  ].map(option => (
                    <button
                      key={option.value}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 ${filterType === option.value ? 'bg-slate-100 text-[var(--erp-accent)]' : ''}`}
                      onClick={() => { setFilterType(option.value as typeof filterType); setShowFilterDropdown(false); }}
                    >
                      {option.label}
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
                    { value: 'name', label: 'Client Name' },
                    { value: 'balance', label: 'Balance' },
                    { value: 'id', label: 'Account ID' }
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
            placeholder="Search Client Name or ID..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[13px] text-[var(--erp-text-muted)]">
          <span>Active Records: {clientData.totalCount}</span>
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
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-semibold text-[var(--erp-text)] truncate flex-1 mr-2">{item.name}</span>
                    <span className={`text-[9px] px-1.5 border uppercase font-bold ${
                      item.type === 'CR' 
                        ? 'bg-green-100 text-green-700 border-green-200' 
                        : 'bg-red-100 text-red-700 border-red-200'
                    }`}>
                      {item.type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-[13px] font-medium ${isSelected ? 'text-[var(--erp-accent)]' : 'text-[var(--erp-text-muted)]'}`}>
                      {item.id}
                    </span>
                    <span className={`text-[13px] font-medium ${
                      item.type === 'CR' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹ {formatCurrency(item.balance)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Add New Button */}
      <div className="p-3 bg-slate-50 border-t border-[var(--erp-border)]">
        <button className="btn btn-primary btn-block btn-lg" onClick={() => showToast('Client creation modal coming soon!', 'info')}>
          <span className="material-symbols-outlined !text-base">person_add</span>
          NEW CLIENT
        </button>
      </div>
    </div>
  );
};

export default ClientListPanel;
