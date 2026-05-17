import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface UserItem {
  id: string;
  username: string;
  role: string;
  status: 'Online' | 'Offline';
  lastLogin: string;
  department: string;
}

// Dummy data for Users
const userData = {
  categories: [
    {
      name: 'Administrators',
      items: [
        { id: 'USR-001', username: 'Admin_Rahul', role: 'System Administrator', status: 'Online' as const, lastLogin: 'Today, 10:24 AM', department: 'IT' },
        { id: 'USR-002', username: 'Admin_Priya', role: 'System Administrator', status: 'Offline' as const, lastLogin: 'Yesterday', department: 'IT' },
      ]
    },
    {
      name: 'Accounts Team',
      items: [
        { id: 'USR-003', username: 'Acc_Sita_Ram', role: 'Data Entry Operator', status: 'Offline' as const, lastLogin: '04-Oct-2023', department: 'Accounts' },
        { id: 'USR-004', username: 'Acc_Mohan', role: 'Accounts Manager', status: 'Online' as const, lastLogin: 'Today, 09:15 AM', department: 'Accounts' },
      ]
    },
    {
      name: 'Sales Team',
      items: [
        { id: 'USR-005', username: 'Sales_Arjun', role: 'Sales Executive', status: 'Offline' as const, lastLogin: '02-Oct-2023', department: 'Sales' },
        { id: 'USR-006', username: 'Sales_Kavita', role: 'Sales Manager', status: 'Online' as const, lastLogin: 'Today, 11:00 AM', department: 'Sales' },
      ]
    },
    {
      name: 'External',
      items: [
        { id: 'USR-007', username: 'Audit_Meera', role: 'External Auditor', status: 'Offline' as const, lastLogin: '28-Sep-2023', department: 'External' },
      ]
    }
  ],
  totalCount: 7
};

type SortOption = 'name' | 'role' | 'status' | 'lastLogin';

interface UserListPanelProps {
  onItemSelect?: (item: UserItem) => void;
  selectedId?: string;
}

const UserListPanel: React.FC<UserListPanelProps> = ({ onItemSelect, selectedId }) => {
  const { showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'Online' | 'Offline'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
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

  const sortItems = (items: UserItem[]): UserItem[] => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.username.localeCompare(b.username);
        case 'role': return a.role.localeCompare(b.role);
        case 'status': return a.status.localeCompare(b.status);
        case 'lastLogin': return a.lastLogin.localeCompare(b.lastLogin);
        default: return 0;
      }
    });
  };

  const filteredCategories = userData.categories.map(category => ({
    ...category,
    items: sortItems(category.items.filter(item =>
      (item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
       item.role.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filterStatus === 'all' || item.status === filterStatus)
    ))
  })).filter(category => category.items.length > 0);

  return (
    <div className="w-[400px] bg-white border-r border-[var(--erp-border)] flex flex-col shrink-0">
      {/* Header with Search and Filters */}
      <div className="p-4 bg-slate-50 border-b border-[var(--erp-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--erp-text-muted)]">Users</h2>
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
                <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-[var(--erp-border)] rounded shadow-lg z-10">
                  <div className="p-2 border-b border-[var(--erp-border)] text-[11px] font-bold uppercase text-[var(--erp-text-muted)]">
                    Filter by Status
                  </div>
                  <div className="p-1">
                    {(['all', 'Online', 'Offline'] as const).map(status => (
                      <button 
                        key={status}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded ${filterStatus === status ? 'bg-blue-50 text-[var(--erp-accent)]' : 'hover:bg-slate-50'}`}
                        onClick={() => { setFilterStatus(status); setShowFilterDropdown(false); }}
                      >
                        {status === 'all' ? 'All Users' : status}
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
                      { key: 'name', label: 'Username' },
                      { key: 'role', label: 'Role' },
                      { key: 'status', label: 'Status' },
                      { key: 'lastLogin', label: 'Last Login' },
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
            placeholder="Search username or role..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[13px] text-[var(--erp-text-muted)]">
          <span>Total: {userData.totalCount}</span>
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
              const isSelected = selectedId === item.id || (!selectedId && item.id === 'USR-001');
              return (
                <div 
                  key={item.id} 
                  className={`p-4 border-b border-[var(--erp-border)] cursor-pointer transition-colors
                    ${isSelected ? 'bg-slate-100 border-l-4 border-l-[var(--erp-accent)]' : 'hover:bg-slate-50'}`}
                  onClick={() => onItemSelect?.(item)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-bold ${isSelected ? 'text-[var(--erp-accent)]' : 'text-[var(--erp-text)]'}`}>
                      {item.username}
                    </span>
                    <span className={`text-[11px] px-1.5 rounded font-bold uppercase ${
                      item.status === 'Online' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 text-[var(--erp-text-muted)]'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-sm text-[var(--erp-text-muted)] font-medium">{item.role}</div>
                  <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-400">
                    <span className="material-symbols-outlined !text-sm">login</span>
                    Last login: {item.lastLogin}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Add New Button */}
      <div className="p-3 bg-slate-50 border-t border-[var(--erp-border)]">
        <button className="btn btn-primary btn-block btn-lg" onClick={() => showToast('User creation modal coming soon!', 'info')}>
          <span className="material-symbols-outlined !text-base">person_add</span>
          ADD USER
        </button>
      </div>
    </div>
  );
};

export default UserListPanel;
