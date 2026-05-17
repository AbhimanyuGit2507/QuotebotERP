import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

interface SearchResult {
  id: string;
  type: 'page' | 'rfq' | 'quote' | 'client' | 'product';
  title: string;
  subtitle?: string;
  path: string;
  icon: string;
}

interface NotificationItem {
  id: string;
  type: 'rfq' | 'quote' | 'inbox' | 'system';
  message: string;
  time: string;
}

const PAGE_SEARCH_ITEMS: SearchResult[] = [
  {
    id: 'page-home',
    type: 'page',
    title: 'Home',
    path: '/home',
    icon: 'home',
  },
  {
    id: 'page-dashboard',
    type: 'page',
    title: 'Dashboard',
    path: '/dashboard',
    icon: 'space_dashboard',
  },
  {
    id: 'page-inbox',
    type: 'page',
    title: 'Inbox',
    path: '/inbox',
    icon: 'all_inbox',
  },
  {
    id: 'page-rfqs',
    type: 'page',
    title: 'RFQ Management',
    path: '/rfq-inbox',
    icon: 'assignment',
  },
  {
    id: 'page-quotations',
    type: 'page',
    title: 'Quotations',
    path: '/quotations',
    icon: 'receipt_long',
  },
  {
    id: 'page-products',
    type: 'page',
    title: 'Products',
    path: '/products',
    icon: 'package_2',
  },
  {
    id: 'page-clients',
    type: 'page',
    title: 'Clients',
    path: '/client-ledger',
    icon: 'groups',
  },
  {
    id: 'page-analytics',
    type: 'page',
    title: 'Analytics',
    path: '/analytics',
    icon: 'monitoring',
  },
  {
    id: 'page-settings',
    type: 'page',
    title: 'Settings',
    path: '/system-config',
    icon: 'tune',
  },
];

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { rfqs, quotes, clients, products, inboxMessages, companySettings } = useApp();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(
    new Set(),
  );
  const [companyDisplayName, setCompanyDisplayName] = useState(
    companySettings.displayName || user?.company_name || 'Quotebot',
  );

  const searchRef = useRef<HTMLDivElement>(null);

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const isActive = (path: string) => location.pathname === path;

  const allSearchableItems = useMemo<SearchResult[]>(
    () => [
      ...PAGE_SEARCH_ITEMS,
      ...rfqs.slice(0, 8).map((rfq) => ({
        id: `rfq-${rfq.id}`,
        type: 'rfq' as const,
        title: rfq.number,
        subtitle: rfq.client,
        path: '/rfq-inbox',
        icon: 'assignment',
      })),
      ...quotes.slice(0, 8).map((quote) => ({
        id: `quote-${quote.id}`,
        type: 'quote' as const,
        title: quote.number,
        subtitle: quote.client,
        path: '/quotations',
        icon: 'receipt_long',
      })),
      ...clients.slice(0, 8).map((client) => ({
        id: `client-${client.id}`,
        type: 'client' as const,
        title: client.name,
        subtitle: client.email,
        path: '/client-ledger',
        icon: 'business',
      })),
      ...products.slice(0, 8).map((product) => ({
        id: `product-${product.id}`,
        type: 'product' as const,
        title: product.name,
        subtitle: `SKU: ${product.sku}`,
        path: '/products',
        icon: 'inventory_2',
      })),
    ],
    [clients, products, quotes, rfqs],
  );

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [
      ...rfqs
        .filter((rfq) => rfq.status === 'pending')
        .slice(0, 2)
        .map((rfq) => ({
          id: `rfq-${rfq.id}`,
          type: 'rfq' as const,
          message: `Pending RFQ ${rfq.number} from ${rfq.client}`,
          time: rfq.date,
        })),
      ...quotes
        .filter((quote) => quote.status === 'sent')
        .slice(0, 2)
        .map((quote) => ({
          id: `quote-${quote.id}`,
          type: 'quote' as const,
          message: `Quotation ${quote.number} sent to ${quote.client}`,
          time: quote.date,
        })),
      ...inboxMessages
        .filter((message) => !message.isRead)
        .slice(0, 2)
        .map((message) => ({
          id: `inbox-${message.id}`,
          type: 'inbox' as const,
          message: `Unread message: ${message.subject}`,
          time: message.timestamp,
        })),
      {
        id: 'system-sync',
        type: 'system',
        message: `Data sync active: ${rfqs.length} RFQs, ${quotes.length} quotes`,
        time: currentDate,
      },
    ];

    return items.slice(0, 6);
  }, [currentDate, inboxMessages, quotes, rfqs]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = allSearchableItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setSearchResults(filtered.slice(0, 8));
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [allSearchableItems, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setCompanyDisplayName(companySettings.displayName || user?.company_name || 'Quotebot');
  }, [companySettings.displayName, user?.company_name]);

  const handleSearchSelect = (result: SearchResult) => {
    navigate(result.path);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const quickActions = [
    {
      icon: 'add_circle',
      label: 'New Quotation',
      shortcut: 'Ctrl+Q',
      action: () => navigate('/quotations'),
    },
    {
      icon: 'request_quote',
      label: 'New RFQ',
      shortcut: 'Ctrl+R',
      action: () => navigate('/rfq-inbox'),
    },
    {
      icon: 'person_add',
      label: 'Add Client',
      shortcut: 'Ctrl+C',
      action: () => navigate('/client-ledger'),
    },
    {
      icon: 'inventory_2',
      label: 'Add Product',
      shortcut: 'Ctrl+P',
      action: () => navigate('/products'),
    },
  ];

  const markAllNotificationsRead = () => {
    setReadNotificationIds(new Set(notifications.map((notification) => notification.id)));
  };

  const markNotificationRead = (id: string) => {
    setReadNotificationIds((prev) => new Set(prev).add(id));
  };

  const unreadCount = notifications.filter(
    (notification) => !readNotificationIds.has(notification.id),
  ).length;

  const userInitial = (user?.name?.trim()?.charAt(0) || 'U').toUpperCase();

  return (
    <header className="h-12 bg-[var(--erp-bg)] border-b border-[var(--erp-border)] flex items-center justify-between px-4 shrink-0 z-20 font-sans">
      <div className="flex items-center gap-4">
        <Link to="/home" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <img src={logo} alt="Quotebot" className="h-8 w-auto" />
          <div className="flex flex-col leading-none">
            <span className="font-bold text-sm uppercase tracking-tight text-[var(--erp-text)]">{companyDisplayName}</span>
            <span className="text-[10px] text-[var(--erp-text-muted)] tracking-widest">ENTERPRISE</span>
          </div>
        </Link>

        <div className="h-6 w-px bg-[var(--erp-border)]"></div>

        <div className="relative" ref={searchRef}>
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--erp-text-muted)] !text-[18px]">search</span>
          <input
            id="global-search"
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            placeholder="Search RFQs, quotes, clients, products... (Ctrl+K)"
            className="w-[420px] pl-9 pr-3 py-1.5 text-sm border border-[var(--erp-border)] rounded-lg bg-[var(--erp-surface)] focus:bg-white focus:ring-2 focus:ring-[var(--erp-accent)]/20 focus:border-[var(--erp-accent)] outline-none transition-all"
          />
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[var(--erp-border)] rounded-lg shadow-xl z-50 overflow-hidden">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSearchSelect(result)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--erp-surface)] transition-colors text-left border-b border-[var(--erp-border)] last:border-0"
                >
                  <span className="material-symbols-outlined !text-[18px] text-[var(--erp-text-muted)]">{result.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--erp-text)] truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-[11px] text-[var(--erp-text-muted)] truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--erp-text-muted)] uppercase bg-[var(--erp-surface)] px-1.5 py-0.5 rounded">
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          )}
          {showSearchResults && searchQuery && searchResults.length === 0 && (
            <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[var(--erp-border)] rounded-lg shadow-xl z-50 p-4 text-center">
              <span className="material-symbols-outlined text-[var(--erp-text-muted)] text-3xl mb-2">search_off</span>
              <p className="text-sm text-[var(--erp-text-muted)]">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="relative">
          <button
            className={`p-2 rounded transition-colors ${showQuickActions ? 'bg-[var(--erp-surface-strong)]' : 'hover:bg-[var(--erp-surface)]'}`}
            onClick={() => {
              setShowQuickActions(!showQuickActions);
              setShowNotifications(false);
              setShowUserMenu(false);
            }}
            title="Quick Actions"
          >
            <span className="material-symbols-outlined text-[var(--erp-text-muted)] !text-xl">bolt</span>
          </button>
          {showQuickActions && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-[var(--erp-border)] rounded-lg shadow-xl z-50 w-56 overflow-hidden">
              <div className="p-2.5 border-b border-[var(--erp-border)] text-[11px] font-bold text-[var(--erp-text-muted)] uppercase bg-[var(--erp-surface)]">
                Quick Actions
              </div>
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    action.action();
                    setShowQuickActions(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-[var(--erp-surface)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined !text-[18px] text-[var(--erp-accent)]">{action.icon}</span>
                    <span>{action.label}</span>
                  </div>
                  <span className="text-[10px] text-[var(--erp-text-muted)] font-mono bg-[var(--erp-surface)] px-1.5 py-0.5 rounded">
                    {action.shortcut}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            className={`p-2 rounded transition-colors relative ${showNotifications ? 'bg-[var(--erp-surface-strong)]' : 'hover:bg-[var(--erp-surface)]'}`}
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowQuickActions(false);
              setShowUserMenu(false);
            }}
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[var(--erp-text-muted)] !text-xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-[var(--erp-accent)] rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-[var(--erp-border)] rounded-lg shadow-xl z-50 w-80 overflow-hidden">
              <div className="p-3 border-b border-[var(--erp-border)] flex items-center justify-between bg-[var(--erp-surface)]">
                <span className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Notifications</span>
                <button
                  onClick={markAllNotificationsRead}
                  className="text-[12px] text-[var(--erp-accent)] hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.map((notification) => {
                  const unread = !readNotificationIds.has(notification.id);
                  return (
                    <div
                      key={notification.id}
                      onClick={() => markNotificationRead(notification.id)}
                      className={`px-3 py-2.5 border-b border-[var(--erp-border)] hover:bg-[var(--erp-surface)] cursor-pointer transition-colors ${unread ? 'bg-[rgba(0,126,167,0.08)]' : ''}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`material-symbols-outlined !text-[18px] mt-0.5 ${unread ? 'text-[var(--erp-accent)]' : 'text-[var(--erp-text-muted)]'}`}
                        >
                          {notification.type === 'rfq'
                            ? 'request_quote'
                            : notification.type === 'quote'
                              ? 'description'
                              : notification.type === 'inbox'
                                ? 'mail'
                                : 'info'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${unread ? 'font-medium' : ''}`}>{notification.message}</p>
                          <p className="text-[11px] text-[var(--erp-text-muted)] mt-0.5">{notification.time}</p>
                        </div>
                        {unread && (
                          <span className="w-2 h-2 bg-[var(--erp-accent)] rounded-full mt-1.5"></span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-[var(--erp-surface-strong)] px-2.5 py-1 rounded text-[12px] mx-1">
          <span className="material-symbols-outlined !text-[16px] text-[var(--erp-text-muted)]">calendar_today</span>
          <span className="font-medium text-[var(--erp-text)]">{currentDate}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-[rgba(0,167,225,0.12)] border border-[rgba(0,167,225,0.35)] px-2.5 py-1 rounded text-[11px] mx-1">
          <span className="material-symbols-outlined !text-[14px] text-[var(--erp-accent-strong)]">monitoring</span>
          <span className="font-semibold text-[var(--erp-accent)]">Live</span>
          <span className="text-[var(--erp-accent-strong)]">•</span>
          <span className="text-[var(--erp-accent)]">{rfqs.length} RFQs · {quotes.length} Quotes</span>
        </div>

        <Link
          to="/system-config"
          className={`p-2 rounded transition-colors ${isActive('/system-config') ? 'bg-[var(--erp-surface-strong)] text-[var(--erp-accent)]' : 'hover:bg-[var(--erp-surface)]'}`}
          title="Settings"
        >
          <span
            className={`material-symbols-outlined !text-xl ${isActive('/system-config') ? 'text-[var(--erp-accent)]' : 'text-[var(--erp-text-muted)]'}`}
          >
            settings
          </span>
        </Link>

        <div className="relative">
          <button
            className={`flex items-center gap-2 p-1.5 rounded transition-colors ${showUserMenu ? 'bg-[var(--erp-surface-strong)]' : 'hover:bg-[var(--erp-surface)]'}`}
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
              setShowQuickActions(false);
            }}
          >
            <div className="w-7 h-7 rounded-full bg-[var(--erp-accent)] flex items-center justify-center text-white font-bold text-sm">
              {userInitial}
            </div>
            <span className="material-symbols-outlined text-[var(--erp-text-muted)] !text-[18px]">expand_more</span>
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-[var(--erp-border)] rounded shadow-lg z-50 w-56">
              <div className="p-3 border-b border-[var(--erp-border)]">
                <p className="font-semibold text-sm text-[var(--erp-text)]">{user?.name || 'User'}</p>
                <p className="text-[12px] text-[var(--erp-text-muted)]">{user?.role || 'Member'}</p>
              </div>
              <div className="py-1">
                <Link to="/user-permissions" className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--erp-surface)]">
                  <span className="material-symbols-outlined !text-[18px] text-[var(--erp-text-muted)]">person</span>
                  My Profile
                </Link>
                <Link to="/system-config" className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--erp-surface)]">
                  <span className="material-symbols-outlined !text-[18px] text-[var(--erp-text-muted)]">tune</span>
                  Preferences
                </Link>
              </div>
              <div className="border-t border-[var(--erp-border)] py-1">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--erp-accent)] hover:bg-[var(--erp-surface)]"
                >
                  <span className="material-symbols-outlined !text-[18px]">logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
