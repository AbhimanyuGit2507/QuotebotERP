import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

// Dummy data for RFQs
const rfqData = {
  categories: [
    {
      name: 'Priority',
      items: [
        { id: 'RFQ/2023/1084', party: 'Global Logistics Solutions Ltd', date: '02-Jan-2024', items: 8, priority: true, status: 'Pending' },
        { id: 'RFQ/2023/1080', party: 'Urgent Tech Corp', date: '30-Dec-2023', items: 5, priority: true, status: 'Pending' },
      ]
    },
    {
      name: 'Pending Review',
      items: [
        { id: 'RFQ/2023/1083', party: 'Tech-Corp International Inc.', date: '01-Jan-2024', items: 3, priority: false, status: 'Pending' },
        { id: 'RFQ/2023/1082', party: 'Swift Manufacturing Unit 4', date: '31-Dec-2023', items: 12, priority: false, status: 'Pending' },
        { id: 'RFQ/2023/1079', party: 'Northern Supply Chain', date: '29-Dec-2023', items: 6, priority: false, status: 'Pending' },
      ]
    },
    {
      name: 'In Progress',
      items: [
        { id: 'RFQ/2023/1075', party: 'Metro Engineering Works', date: '25-Dec-2023', items: 4, priority: false, status: 'In Progress' },
        { id: 'RFQ/2023/1072', party: 'Pacific Trading Co.', date: '22-Dec-2023', items: 9, priority: false, status: 'In Progress' },
      ]
    }
  ],
  totalCount: 42
};

interface RFQItem {
  id: string;
  party: string;
  date: string;
  items: number;
  priority: boolean;
  status: string;
}

type SortOption = 'date' | 'party' | 'items' | 'id';
type StatusFilter = 'all' | 'Pending' | 'In Progress';

interface RFQListPanelProps {
  onItemSelect?: (item: RFQItem) => void;
  selectedId?: string;
}

const RFQListPanel: React.FC<RFQListPanelProps> = ({ onItemSelect, selectedId }) => {
  const { showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'priority' | 'normal'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
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

  const sortItems = (items: RFQItem[]): RFQItem[] => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'date': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'party': return a.party.localeCompare(b.party);
        case 'items': return b.items - a.items;
        case 'id': return b.id.localeCompare(a.id);
        default: return 0;
      }
    });
  };

  const filteredCategories = rfqData.categories.map(category => ({
    ...category,
    items: sortItems(category.items.filter(item =>
      (item.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
       item.id.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filterStatus === 'all' || item.status === filterStatus) &&
      (filterPriority === 'all' || (filterPriority === 'priority' ? item.priority : !item.priority))
    ))
  })).filter(category => category.items.length > 0);

  return (
    <div className="w-[400px] bg-white border-r border-[var(--erp-border)] flex flex-col shrink-0">
      {/* Header with Search and Filters */}
      <div className="p-4 bg-slate-50 border-b border-[var(--erp-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--erp-text-muted)]">RFQ Inbox</h2>
          <div className="flex items-center gap-1 relative">
            {/* Filter Dropdown */}
            <div className="relative">
              <button 
                className={`p-1.5 rounded transition-colors ${showFilterDropdown ? 'bg-slate-200' : 'hover:bg-slate-200'}`}
                title="Filter"
                onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowSortDropdown(false); }}
              >
                <span className="material-symbols-outlined text-[var(--erp-text-muted)] !text-base">filter_list</span>
              </button>
              {showFilterDropdown && (
                <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-[var(--erp-border)] rounded shadow-lg z-10">
                  <div className="p-2 border-b border-[var(--erp-border)] text-[11px] font-bold uppercase text-[var(--erp-text-muted)]">
                    Filter by Status
                  </div>
                  <div className="p-1 border-b border-[var(--erp-border)]">
                    {(['all', 'Pending', 'In Progress'] as StatusFilter[]).map(status => (
                      <button 
                        key={status}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded ${filterStatus === status ? 'bg-blue-50 text-[var(--erp-accent)]' : 'hover:bg-slate-50'}`}
                        onClick={() => setFilterStatus(status)}
                      >
                        {status === 'all' ? 'All Status' : status}
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-b border-[var(--erp-border)] text-[11px] font-bold uppercase text-[var(--erp-text-muted)]">
                    Priority
                  </div>
                  <div className="p-1">
                    {(['all', 'priority', 'normal'] as const).map(p => (
                      <button 
                        key={p}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded ${filterPriority === p ? 'bg-blue-50 text-[var(--erp-accent)]' : 'hover:bg-slate-50'}`}
                        onClick={() => { setFilterPriority(p); setShowFilterDropdown(false); }}
                      >
                        {p === 'all' ? 'All' : p === 'priority' ? 'Priority Only' : 'Normal Only'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Sort Dropdown */}
            <div className="relative">
              <button 
                className={`p-1.5 rounded transition-colors ${showSortDropdown ? 'bg-slate-200' : 'hover:bg-slate-200'}`}
                title="Sort"
                onClick={() => { setShowSortDropdown(!showSortDropdown); setShowFilterDropdown(false); }}
              >
                <span className="material-symbols-outlined text-[var(--erp-text-muted)] !text-base">sort</span>
              </button>
              {showSortDropdown && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-[var(--erp-border)] rounded shadow-lg z-10">
                  <div className="p-2 border-b border-[var(--erp-border)] text-[11px] font-bold uppercase text-[var(--erp-text-muted)]">
                    Sort By
                  </div>
                  <div className="p-1">
                    {([
                      { key: 'date', label: 'Date' },
                      { key: 'party', label: 'Party Name' },
                      { key: 'items', label: 'Item Count' },
                      { key: 'id', label: 'RFQ Number' },
                    ] as { key: SortOption; label: string }[]).map(opt => (
                      <button 
                        key={opt.key}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded ${sortBy === opt.key ? 'bg-blue-50 text-[var(--erp-accent)]' : 'hover:bg-slate-50'}`}
                        onClick={() => { setSortBy(opt.key); setShowSortDropdown(false); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
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
            placeholder="Search RFQ No. or Party..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[13px] text-[var(--erp-text-muted)]">
          <span>Total: {rfqData.totalCount}</span>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredCategories.map((category) => (
          <div key={category.name}>
            {/* Collapsible Category Header */}
            <button 
              className="w-full px-4 py-2.5 text-[13px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest bg-slate-50 border-b border-[var(--erp-border)] flex items-center justify-between hover:bg-slate-100 transition-colors sticky top-0"
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
            {!collapsedCategories.has(category.name) && category.items.map((item, idx) => {
              const isSelected = selectedId === item.id || (!selectedId && category.name === filteredCategories[0]?.name && idx === 0);
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
                    <div className="flex items-center gap-2">
                      {item.priority && (
                        <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 border border-amber-200 uppercase font-bold">
                          Priority
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-[var(--erp-text)] truncate">{item.party}</div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[13px] text-[var(--erp-text-muted)]">{item.date}</span>
                    <span className="text-[13px] text-slate-400">{item.items} Items</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Add New Button */}
      <div className="p-3 bg-slate-50 border-t border-[var(--erp-border)]">
        <button className="btn btn-primary btn-block btn-lg" onClick={() => showToast('RFQ creation modal coming soon!', 'info')}>
          <span className="material-symbols-outlined !text-base">add_circle</span>
          NEW RFQ
        </button>
      </div>
    </div>
  );
};

export default RFQListPanel;
