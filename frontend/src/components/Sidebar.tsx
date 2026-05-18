import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? saved === 'true' : true;
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTabletHovered, setIsTabletHovered] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebarExpanded', String(isExpanded));
  }, [isExpanded]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const mainMenuItems = [
    { path: '/dashboard', icon: 'space_dashboard', label: 'Dashboard' },
    { path: '/inbox', icon: 'all_inbox', label: 'Inbox' },
    { path: '/rfq-inbox', icon: 'assignment', label: 'RFQ Management' },
    { path: '/quotations', icon: 'receipt_long', label: 'Quotations' },
    { path: '/orders', icon: 'shopping_cart', label: 'Orders' },
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

  // Determine if label should show based on context
  const shouldShowLabel = useCallback(
    (context: 'desktop' | 'tablet' | 'mobile') => {
      if (context === 'mobile') return true;
      if (context === 'tablet') return isTabletHovered;
      return isExpanded;
    },
    [isExpanded, isTabletHovered],
  );

  const NavItem = ({
    item,
    active,
    showLabel,
  }: {
    item: (typeof mainMenuItems)[0];
    active: boolean;
    showLabel: boolean;
  }) => (
    <Link
      to={item.path}
      className={`app-sidebar-item group flex items-center gap-3 mx-2 px-2.5 h-[40px] text-[13px] rounded-lg transition-colors duration-200 ease-out ${
        active
          ? 'app-sidebar-item-active text-white'
          : 'app-sidebar-item-inactive text-[var(--erp-sidebar-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.08)]'
      }`}
      title={!showLabel ? item.label : ''}
      style={
        active
          ? {
              backgroundImage:
                'linear-gradient(90deg, rgba(0,126,167,1) 0%, rgba(0,167,225,0.85) 42%, rgba(0,52,89,0) 100%)',
            }
          : undefined
      }
    >
      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
      {showLabel && (
        <span className={`whitespace-nowrap ${active ? 'font-semibold' : 'font-medium'}`}>
          {item.label}
        </span>
      )}
    </Link>
  );

  const sidebarContent = (context: 'desktop' | 'tablet' | 'mobile') => {
    const showLabel = shouldShowLabel(context);
    return (
      <>
        <div className="h-[52px] px-3 border-b border-[rgba(255,255,255,0.12)] flex items-center gap-2.5">
          {context === 'mobile' ? (
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--erp-sidebar-muted)] hover:text-white hover:bg-[var(--erp-sidebar-hover)] transition-all duration-200"
              onClick={() => setIsMobileOpen(false)}
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          ) : (
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--erp-sidebar-muted)] hover:text-white hover:bg-[var(--erp-sidebar-hover)] transition-all duration-200"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span className="material-symbols-outlined text-[20px]">
                {showLabel ? 'menu_open' : 'menu'}
              </span>
            </button>
          )}
          {showLabel && (
            <p className="text-[11px] uppercase text-[var(--erp-sidebar-muted)] font-semibold tracking-wider whitespace-nowrap">
              Menu
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5">
          {mainMenuItems.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              active={isActive(item.path) || (item.path === '/dashboard' && location.pathname === '/')}
              showLabel={showLabel}
            />
          ))}
        </div>
        <div className="border-t border-[rgba(255,255,255,0.12)] py-2 space-y-0.5">
          {bottomMenuItems.map((item) => (
            <NavItem key={item.path} item={item} active={isActive(item.path)} showLabel={showLabel} />
          ))}
        </div>
      </>
    );
  };

  return (
    <>
      {/* Mobile hamburger button - fixed at top-left, visible only on <768px */}
      <button
        className="fixed top-[10px] left-2 z-50 w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--erp-primary)] text-white shadow-lg md:hidden"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined text-[22px]">menu</span>
      </button>

      {/* Mobile drawer overlay + slide-out - <768px */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileOpen(false)} />
        {/* Drawer */}
        <aside
          className={`absolute top-0 left-0 h-full w-64 bg-gradient-to-b from-[var(--erp-primary)] via-[var(--erp-sidebar-bg)] to-[rgba(0,52,89,0.92)] text-white flex flex-col transition-transform duration-300 ease-in-out ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent('mobile')}
        </aside>
      </div>

      {/* Tablet sidebar - 768px-1024px: collapsed by default, expands on hover */}
      <aside
        className={`hidden md:flex lg:hidden flex-col shrink-0 bg-gradient-to-b from-[var(--erp-primary)] via-[var(--erp-sidebar-bg)] to-[rgba(0,52,89,0.92)] text-white transition-all duration-300 ${
          isTabletHovered ? 'w-56' : 'w-[56px]'
        }`}
        onMouseEnter={() => setIsTabletHovered(true)}
        onMouseLeave={() => setIsTabletHovered(false)}
      >
        {sidebarContent('tablet')}
      </aside>

      {/* Desktop sidebar - >=1024px: full sidebar with toggle */}
      <aside
        className={`app-sidebar hidden lg:flex flex-col shrink-0 bg-gradient-to-b from-[var(--erp-primary)] via-[var(--erp-sidebar-bg)] to-[rgba(0,52,89,0.92)] text-white transition-all duration-300 font-sans ${
          isExpanded ? 'w-56' : 'w-[56px]'
        }`}
      >
        {sidebarContent('desktop')}
      </aside>
    </>
  );
};

export default Sidebar;
