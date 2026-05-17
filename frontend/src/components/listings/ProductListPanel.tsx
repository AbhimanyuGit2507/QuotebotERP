import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

// Dummy data for Products
const productData = {
  categories: [
    {
      name: 'Electronics',
      items: [
        { sku: 'SKU-MAC-001', name: 'Apple MacBook Pro 14" M2', category: 'Electronics', price: '$1,999.00', stock: 'In Stock' },
        { sku: 'SKU-DLX-015', name: 'Dell XPS 15 9530', category: 'Electronics', price: '$1,450.00', stock: 'In Stock' },
        { sku: 'SKU-THK-X1C', name: 'Lenovo ThinkPad X1 Carbon Gen 11', category: 'Electronics', price: '$1,620.00', stock: 'Out of Stock' },
      ]
    },
    {
      name: 'Peripherals',
      items: [
        { sku: 'SKU-LOG-MX3', name: 'Logitech MX Master 3S Mouse', category: 'Peripherals', price: '$99.00', stock: 'In Stock' },
        { sku: 'SKU-LOG-K95', name: 'Logitech K950 Keyboard', category: 'Peripherals', price: '$149.00', stock: 'Low Stock' },
      ]
    },
    {
      name: 'Mobile',
      items: [
        { sku: 'SKU-SAM-S23', name: 'Samsung Galaxy S23 Ultra', category: 'Mobile', price: '$1,199.00', stock: 'Low Stock' },
        { sku: 'SKU-IPH-15P', name: 'iPhone 15 Pro Max 256GB', category: 'Mobile', price: '$1,299.00', stock: 'In Stock' },
      ]
    }
  ],
  totalCount: 7
};

type SortOption = 'name' | 'price' | 'stock' | 'sku';
type StockFilter = 'all' | 'In Stock' | 'Low Stock' | 'Out of Stock';

interface ProductListPanelProps {
  onItemSelect?: (item: typeof productData.categories[0]['items'][0]) => void;
  selectedSku?: string;
}

const ProductListPanel: React.FC<ProductListPanelProps> = ({ onItemSelect, selectedSku }) => {
  const { showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [filterStock, setFilterStock] = useState<StockFilter>('all');
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

  const getStockBadgeColor = (stock: string) => {
    switch (stock) {
      case 'In Stock': return 'bg-green-100 text-green-700';
      case 'Low Stock': return 'bg-orange-100 text-orange-700';
      case 'Out of Stock': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const parsePrice = (price: string) => parseFloat(price.replace(/[$,]/g, ''));

  const sortItems = (items: typeof productData.categories[0]['items']) => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'sku': return a.sku.localeCompare(b.sku);
        case 'price': return parsePrice(a.price) - parsePrice(b.price);
        case 'stock': {
          const order = { 'In Stock': 0, 'Low Stock': 1, 'Out of Stock': 2 };
          return (order[a.stock as keyof typeof order] || 0) - (order[b.stock as keyof typeof order] || 0);
        }
        default: return 0;
      }
    });
  };

  const filteredCategories = productData.categories.map(category => ({
    ...category,
    items: sortItems(category.items.filter(item =>
      (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       item.sku.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filterStock === 'all' || item.stock === filterStock)
    ))
  })).filter(category => category.items.length > 0);

  return (
    <div className="w-[400px] bg-white border-r border-[var(--erp-border)] flex flex-col shrink-0">
      {/* Header with Search and Filters */}
      <div className="p-4 bg-slate-50 border-b border-[var(--erp-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--erp-text-muted)]">Product Catalog</h2>
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
                    Filter by Stock
                  </div>
                  <div className="p-1">
                    {(['all', 'In Stock', 'Low Stock', 'Out of Stock'] as StockFilter[]).map(status => (
                      <button 
                        key={status}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded ${filterStock === status ? 'bg-blue-50 text-[var(--erp-accent)]' : 'hover:bg-slate-50'}`}
                        onClick={() => { setFilterStock(status); setShowFilterDropdown(false); }}
                      >
                        {status === 'all' ? 'All Items' : status}
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
                      { key: 'name', label: 'Name' },
                      { key: 'sku', label: 'SKU' },
                      { key: 'price', label: 'Price' },
                      { key: 'stock', label: 'Stock Status' },
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
            placeholder="Search SKU, Name..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[13px] text-[var(--erp-text-muted)]">
          <span>{productData.totalCount} items</span>
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
              const isSelected = selectedSku === item.sku || (!selectedSku && category.name === filteredCategories[0]?.name && idx === 0);
              return (
                <div 
                  key={item.sku} 
                  className={`p-4 border-b border-[var(--erp-border)] cursor-pointer transition-colors
                    ${isSelected ? 'bg-slate-100 border-l-4 border-l-[var(--erp-accent)]' : 'hover:bg-slate-50'}`}
                  onClick={() => onItemSelect?.(item)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-bold ${isSelected ? 'text-[var(--erp-accent)]' : 'text-[var(--erp-text-muted)]'}`}>
                      {item.sku}
                    </span>
                    <span className={`text-[13px] px-1.5 font-bold ${getStockBadgeColor(item.stock)}`}>
                      {item.stock}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-[var(--erp-text)]">{item.name}</div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[13px] text-[var(--erp-text-muted)]">Category: {item.category}</span>
                    <span className="text-sm font-bold text-[var(--erp-text)]">{item.price}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Add New Button */}
      <div className="p-3 bg-slate-50 border-t border-[var(--erp-border)]">
        <button className="btn btn-primary btn-block btn-lg" onClick={() => showToast('Product creation modal coming soon!', 'info')}>
          <span className="material-symbols-outlined !text-base">add_circle</span>
          NEW PRODUCT
        </button>
      </div>
    </div>
  );
};

export default ProductListPanel;
