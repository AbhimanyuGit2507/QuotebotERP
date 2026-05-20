import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

const coreItems: NavItem[] = [
  { path: '/dashboard', icon: 'space_dashboard', label: 'Dashboard' },
  { path: '/inbox', icon: 'all_inbox', label: 'Inbox' },
  { path: '/rfq-inbox', icon: 'assignment', label: 'RFQ Management' },
];

const salesItems: NavItem[] = [
  { path: '/quotations', icon: 'receipt_long', label: 'Quotations' },
  { path: '/orders', icon: 'shopping_cart', label: 'Orders' },
  { path: '/invoices', icon: 'receipt', label: 'Invoices' },
  { path: '/payments', icon: 'currency_rupee', label: 'Payments' },
  { path: '/bills', icon: 'receipt_long', label: 'Bills' },
];

const procurementItems: NavItem[] = [
  { path: '/purchase-orders', icon: 'shopping_cart_checkout', label: 'Purchase Orders' },
];

const financeItems: NavItem[] = [
  { path: '/accounting', icon: 'account_balance', label: 'Accounting' },
];

const peopleItems: NavItem[] = [
  { path: '/client-ledger', icon: 'groups', label: 'Clients' },
  { path: '/suppliers', icon: 'local_shipping', label: 'Suppliers' },
];

const inventoryItems: NavItem[] = [
  { path: '/products', icon: 'package_2', label: 'Products' },
  { path: '/inventory', icon: 'inventory_2', label: 'Inventory' },
];

const intelligenceItems: NavItem[] = [
  { path: '/analytics', icon: 'monitoring', label: 'Analytics' },
  { path: '/item-intelligence', icon: 'psychology', label: 'Item Intelligence' },
];

const mobileBottomNavItems: NavItem[] = [
  { path: '/dashboard', icon: 'space_dashboard', label: 'Dashboard' },
  { path: '/inbox', icon: 'all_inbox', label: 'Inbox' },
  { path: '/quotations', icon: 'receipt_long', label: 'Quotes' },
  { path: '/products', icon: 'package_2', label: 'Products' },
  { path: '/client-ledger', icon: 'groups', label: 'Clients' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? saved === 'true' : true;
  });
  const [showMoreOverlay, setShowMoreOverlay] = useState(false);

  // Track which groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebarGroups');
      return saved ? (JSON.parse(saved) as Record<string, boolean>) : {
        Sales: true,
        Procurement: true,
        Finance: false,
        People: true,
        Inventory: true,
        Intelligence: false,
      };
    } catch {
      return { Sales: true, Procurement: true, Finance: false, People: true, Inventory: true, Intelligence: false };
    }
  });

  useEffect(() => {
    localStorage.setItem('sidebarExpanded', String(isExpanded));
  }, [isExpanded]);

  useEffect(() => {
    localStorage.setItem('sidebarGroups', JSON.stringify(openGroups));
  }, [openGroups]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const bottomMenuItems: NavItem[] = [
    ...(user?.role === 'admin'
      ? [{ path: '/admin', icon: 'admin_panel_settings', label: 'Admin Console' }]
      : []),
    { path: '/user-permissions', icon: 'shield_person', label: 'Users & Roles' },
    { path: '/audit-log', icon: 'history', label: 'Audit Log' },
    { path: '/system-config', icon: 'tune', label: 'Settings' },
  ];

  const NavItemComponent = ({ item, active }: { item: NavItem; active: boolean }) => (
    <Link
      to={item.path}
      className={`app-sidebar-item group flex items-center gap-3 mx-2 px-2.5 h-[40px] text-[13px] rounded-lg transition-colors duration-200 ease-out relative pointer-events-auto ${
        active
          ? 'app-sidebar-item-active text-white'
          : 'app-sidebar-item-inactive text-[var(--erp-sidebar-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.08)]'
      }`}
      title={!isExpanded ? item.label : ''}
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
      {isExpanded && (
        <span className={`whitespace-nowrap ${active ? 'font-semibold' : 'font-medium'}`}>
          {item.label}
        </span>
      )}
    </Link>
  );

  const GroupHeader = ({ name }: { name: string }) => {
    if (!isExpanded) return null;
    return (
      <button
        onClick={() => toggleGroup(name)}
        className="flex items-center justify-between w-full px-4 pt-3 pb-1"
      >
        <span className="text-[10px] uppercase font-bold tracking-widest text-[rgba(255,255,255,0.35)]">
          {name}
        </span>
        <span className="material-symbols-outlined text-[14px] text-[rgba(255,255,255,0.35)]">
          {openGroups[name] ? 'expand_less' : 'expand_more'}
        </span>
      </button>
    );
  };

  const allItems = [
    ...coreItems,
    ...salesItems,
    ...procurementItems,
    ...financeItems,
    ...peopleItems,
    ...inventoryItems,
    ...intelligenceItems,
    ...bottomMenuItems,
  ];

  const renderGroup = (name: string, items: NavItem[]) => {
    const isOpen = openGroups[name] !== false;
    return (
      <div key={name}>
        <GroupHeader name={name} />
        {(isOpen || !isExpanded) && items.map((item) => (
          <NavItemComponent
            key={item.path}
            item={item}
            active={isActive(item.path) || (item.path === '/dashboard' && location.pathname === '/')}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`app-sidebar hidden md:flex ${isExpanded ? 'w-56' : 'w-[56px]'} bg-gradient-to-b from-[var(--erp-primary)] via-[var(--erp-sidebar-bg)] to-[rgba(0,52,89,0.92)] text-white flex-col shrink-0 transition-[width] duration-300 font-sans relative z-40 will-change-[width]`}
        style={{ contain: 'layout paint' }}
      >
        <div className="h-[52px] px-3 border-b border-[rgba(255,255,255,0.12)] flex items-center gap-2.5">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--erp-sidebar-muted)] hover:text-white hover:bg-[var(--erp-sidebar-hover)] transition-colors duration-200"
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

        <div className="app-sidebar-scroll flex-1 overflow-y-scroll overflow-x-hidden py-2">
          {/* Core — always visible, no header */}
          {coreItems.map((item) => (
            <NavItemComponent
              key={item.path}
              item={item}
              active={isActive(item.path) || (item.path === '/dashboard' && location.pathname === '/')}
            />
          ))}

          {renderGroup('Sales', salesItems)}
          {renderGroup('Procurement', procurementItems)}
          {renderGroup('Finance', financeItems)}
          {renderGroup('People', peopleItems)}
          {renderGroup('Inventory', inventoryItems)}
          {renderGroup('Intelligence', intelligenceItems)}
        </div>

        <div className="border-t border-[rgba(255,255,255,0.12)] py-2 space-y-0.5">
          {bottomMenuItems.map((item) => (
            <NavItemComponent
              key={item.path}
              item={item}
              active={isActive(item.path)}
            />
          ))}
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--palette-deep-space)] border-t border-[rgba(255,255,255,0.12)] flex items-center justify-around h-14 px-1">
        {mobileBottomNavItems.map((item) => {
          const active = isActive(item.path) || (item.path === '/dashboard' && location.pathname === '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-[44px] ${
                active ? 'text-[var(--palette-fresh-sky)]' : 'text-[rgba(255,255,255,0.5)]'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-[9px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setShowMoreOverlay(true)}
          className={`flex flex-col items-center justify-center flex-1 h-full min-w-[44px] ${
            showMoreOverlay ? 'text-[var(--palette-fresh-sky)]' : 'text-[rgba(255,255,255,0.5)]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">more_horiz</span>
          <span className="text-[9px] mt-0.5 font-medium">More</span>
        </button>
      </nav>

      {/* Mobile More Overlay */}
      {showMoreOverlay && (
        <div className="md:hidden fixed inset-0 z-[60] bg-[var(--palette-deep-space)] flex flex-col">
          <div className="h-14 flex items-center justify-between px-4 border-b border-[rgba(255,255,255,0.12)]">
            <span className="text-white font-bold text-sm uppercase tracking-wider">All Navigation</span>
            <button
              onClick={() => setShowMoreOverlay(false)}
              className="w-10 h-10 flex items-center justify-center text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {allItems.map((item) => {
              const active = isActive(item.path) || (item.path === '/dashboard' && location.pathname === '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setShowMoreOverlay(false)}
                  className={`flex items-center gap-4 px-5 h-[52px] text-[14px] transition-colors ${
                    active
                      ? 'text-[var(--palette-fresh-sky)] bg-[rgba(0,126,167,0.15)]'
                      : 'text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  <span className={active ? 'font-semibold' : 'font-medium'}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(Sidebar);
