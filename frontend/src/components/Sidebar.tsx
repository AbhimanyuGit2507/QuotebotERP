import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? saved === 'true' : true;
  });
  
  useEffect(() => {
    localStorage.setItem('sidebarExpanded', String(isExpanded));
  }, [isExpanded]);
  
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const mainMenuItems = [
    { path: '/home', icon: 'home', label: 'Home' },
    { path: '/dashboard', icon: 'space_dashboard', label: 'Dashboard' },
    { path: '/inbox', icon: 'all_inbox', label: 'Inbox' },
    { path: '/rfq-inbox', icon: 'assignment', label: 'RFQ Management' },
    { path: '/quotations', icon: 'receipt_long', label: 'Quotations' },
    { path: '/invoices', icon: 'receipt', label: 'Invoices' },
    { path: '/products', icon: 'package_2', label: 'Products / Inventory' },
    { path: '/client-ledger', icon: 'groups', label: 'Clients' },
    { path: '/analytics', icon: 'monitoring', label: 'Analytics' },
  ];

  const bottomMenuItems = [
    ...(user?.role === 'admin'
      ? [{ path: '/admin', icon: 'admin_panel_settings', label: 'Admin Console' }]
      : []),
    { path: '/user-permissions', icon: 'shield_person', label: 'Users & Roles' },
    { path: '/system-config', icon: 'tune', label: 'Settings' },
  ];

  const NavItem = ({ item, active }: { item: typeof mainMenuItems[0]; active: boolean }) => (
    <Link 
      to={item.path} 
      className={`app-sidebar-item group flex items-center gap-3 mx-2 px-2.5 h-[40px] text-[13px] rounded-lg transition-colors duration-200 ease-out ${
        active
          ? 'app-sidebar-item-active text-white'
          : 'app-sidebar-item-inactive text-[var(--erp-sidebar-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.08)]'
      }`}
      title={!isExpanded ? item.label : ""}
      style={
        active
          ? {
              backgroundImage:
                'linear-gradient(90deg, rgba(0,126,167,1) 0%, rgba(0,167,225,0.85) 42%, rgba(0,52,89,0) 100%)',
            }
          : undefined
      }
    >
      <span className="material-symbols-outlined text-[20px]">
        {item.icon}
      </span>
      {isExpanded && (
        <span className={`whitespace-nowrap ${active ? 'font-semibold' : 'font-medium'}`}>
          {item.label}
        </span>
      )}
    </Link>
  );

  return (
    <aside
      className={`app-sidebar ${isExpanded ? 'w-56' : 'w-[56px]'} bg-gradient-to-b from-[var(--erp-primary)] via-[var(--erp-sidebar-bg)] to-[rgba(0,52,89,0.92)] text-white flex flex-col shrink-0 transition-all duration-300 font-sans`}
    >
      <div className="h-[52px] px-3 border-b border-[rgba(255,255,255,0.12)] flex items-center gap-2.5">
        <button 
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--erp-sidebar-muted)] hover:text-white hover:bg-[var(--erp-sidebar-hover)] transition-all duration-200"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isExpanded ? 'menu_open' : 'menu'}
          </span>
        </button>
        {isExpanded && (
          <p className="text-[11px] uppercase text-[var(--erp-sidebar-muted)] font-semibold tracking-wider whitespace-nowrap">
            Menu
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5">
        {mainMenuItems.map(item => (
          <NavItem 
            key={item.path}
            item={item}
            active={isActive(item.path) || (item.path === '/dashboard' && location.pathname === '/')}
          />
        ))}
      </div>
      <div className="border-t border-[rgba(255,255,255,0.12)] py-2 space-y-0.5">
        {bottomMenuItems.map(item => (
          <NavItem 
            key={item.path}
            item={item}
            active={isActive(item.path)}
          />
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
