import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Calendar from './Calendar';

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
  type: 'rfq' | 'quote' | 'inbox' | 'system' | 'stock';
  title: string;
  message: string;
  time: string;
  action?: () => void;
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
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const currentDate = selectedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const calendarRef = useRef<HTMLDivElement | null>(null);

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
    const items: NotificationItem[] = [];
    
    // Pending RFQs - high priority
    const pendingRfqs = rfqs.filter((rfq) => rfq.status === 'pending').slice(0, 2);
    pendingRfqs.forEach((rfq) => {
      items.push({
        id: `rfq-${rfq.id}`,
        type: 'rfq' as const,
        title: `New RFQ: ${rfq.number}`,
        message: `From ${rfq.client} - Requires processing`,
        time: new Date(rfq.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        action: () => navigate('/rfq-inbox'),
      });
    });

    // Unread inbox messages
    const unreadMessages = inboxMessages.filter((message) => !message.isRead).slice(0, 2);
    unreadMessages.forEach((message) => {
      items.push({
        id: `inbox-${message.id}`,
        type: 'inbox' as const,
        title: 'Unread Email',
        message: message.subject,
        time: new Date(message.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        action: () => navigate('/inbox'),
      });
    });

    // Recent sent quotes
    const sentQuotes = quotes.filter((quote) => quote.status === 'sent').slice(0, 1);
    sentQuotes.forEach((quote) => {
      items.push({
        id: `quote-${quote.id}`,
        type: 'quote' as const,
        title: `Quotation Sent: ${quote.number}`,
        message: `Delivered to ${quote.client}`,
        time: new Date(quote.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        action: () => navigate('/quotations'),
      });
    });

    // Low stock warnings
    const lowStockProducts = products.filter(p => p.stock && p.stock <= 10).slice(0, 2);
    lowStockProducts.forEach((product) => {
      items.push({
        id: `stock-${product.id}`,
        type: 'stock' as const,
        title: 'Low Stock Alert',
        message: `${product.name} - Only ${product.stock} units remaining`,
        time: currentDate,
        action: () => navigate('/products'),
      });
    });

    // System status
    if (items.length < 5) {
      items.push({
        id: 'system-status',
        type: 'system',
        title: 'System Status',
        message: `${rfqs.length} RFQs • ${quotes.length} Quotations • ${clients.length} Clients`,
        time: currentDate,
      });
    }

    return items.slice(0, 8);
  }, [currentDate, inboxMessages, quotes, rfqs, products, clients, navigate]);

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
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setShowQuickActions(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
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

  // Close calendar when clicking outside or pressing Escape
  useEffect(() => {
    if (!showCalendar) return;
    const handleDocClick = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCalendar(false);
    };
    document.addEventListener('mousedown', handleDocClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showCalendar]);

  useEffect(() => {
    setCompanyDisplayName(companySettings.displayName || user?.company_name || 'Quotebot');
  }, [companySettings.displayName, user?.company_name]);

  const handleSearchSelect = (result: SearchResult) => {
    navigate(result.path);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const pendingRfqsCount = rfqs.filter(rfq => rfq.status === 'pending').length;
  const unresolvedQuotesCount = quotes.filter(quote => quote.status === 'sent' || quote.status === 'draft').length;
  const unreadInboxCount = inboxMessages.filter(msg => !msg.isRead).length;
  const lowStockCount = products.filter(p => p.stock && p.stock <= 10).length;

  // Today's stats for Inbox (orders, inquiries, followups)
  const todayKey = currentDate; // formatted date string used above
  const todaysOrdersCount = inboxMessages.filter((m) => {
    try {
      const d = new Date(m.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      return d === todayKey && (m.classification === 'PO' || (m.parsedItems || []).some(p => p.status === 'matched'));
    } catch {
      return false;
    }
  }).length;
  const todaysInquiriesCount = inboxMessages.filter((m) => {
    try {
      const d = new Date(m.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const isRfq = m.classification === 'RFQ' || Boolean(m.rfqId) || (m.extractedItems || 0) > 0 || (m.parsedItems || []).length > 0;
      return d === todayKey && isRfq;
    } catch {
      return false;
    }
  }).length;
  const todaysFollowupsCount = inboxMessages.filter((m) => {
    try {
      const d = new Date(m.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      return d === todayKey && m.classification === 'FOLLOWUP';
    } catch {
      return false;
    }
  }).length;

  const quickActions = [
    {
      icon: 'inbox',
      label: 'Inbox',
      description: `${unreadInboxCount} unread messages`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => navigate('/inbox'),
      count: unreadInboxCount,
    },
    {
      icon: 'assignment',
      label: 'Pending RFQs',
      description: `${pendingRfqsCount} require attention`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      action: () => navigate('/rfq-inbox'),
      count: pendingRfqsCount,
    },
    {
      icon: 'receipt_long',
      label: 'Active Quotations',
      description: `${unresolvedQuotesCount} in progress`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      action: () => navigate('/quotations'),
      count: unresolvedQuotesCount,
    },
    {
      icon: 'inventory',
      label: 'Low Stock Items',
      description: `${lowStockCount} need restocking`,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      action: () => navigate('/products'),
      count: lowStockCount,
    },
    {
      icon: 'analytics',
      label: 'View Analytics',
      description: 'Performance dashboard',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => navigate('/analytics'),
      count: 0,
    },
    {
      icon: 'groups',
      label: 'Client Ledger',
      description: `${clients.length} total clients`,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      action: () => navigate('/client-ledger'),
      count: clients.length,
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
    <header className="bg-[var(--erp-bg)] border-b border-[var(--erp-border)] shrink-0 z-20 font-sans">
      {/* Main header row */}
      <div className="h-12 flex items-center justify-between px-2 sm:px-4">
        {/* Left: Logo + Search (search hidden on mobile, shown below) */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Spacer for mobile hamburger menu */}
          <div className="w-9 md:hidden shrink-0" />

          <Link to="/home" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <img src={logo} alt="Quotebot" className="h-7 sm:h-8 w-auto" />
            <div className="flex flex-col leading-none">
              <span className="font-bold text-xs sm:text-sm uppercase tracking-tight text-[var(--erp-text)]">{companyDisplayName}</span>
              <span className="text-[9px] sm:text-[10px] text-[var(--erp-text-muted)] tracking-widest">ENTERPRISE</span>
            </div>
          </Link>

          <div className="hidden sm:block h-6 w-px bg-[var(--erp-border)]"></div>

          {/* Search bar - hidden on mobile, shown in second row */}
          <div className="relative hidden md:block" ref={searchRef}>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--erp-text-muted)] !text-[18px]">search</span>
            <input
              id="global-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              placeholder="Search RFQs, quotes, clients, products... (Ctrl+K)"
              className="w-[280px] lg:w-[420px] pl-9 pr-3 py-1.5 text-sm border border-[var(--erp-border)] rounded-lg bg-[var(--erp-surface)] focus:bg-white focus:ring-2 focus:ring-[var(--erp-accent)]/20 focus:border-[var(--erp-accent)] outline-none transition-all"
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
                <p className="text-sm text-[var(--erp-text-muted)]">No results found for &quot;{searchQuery}&quot;</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <div className="relative" ref={quickActionsRef}>
            <button
              className={`p-1.5 sm:p-2 rounded transition-colors ${showQuickActions ? 'bg-[var(--erp-surface-strong)]' : 'hover:bg-[var(--erp-surface)]'}`}
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
              <div className="absolute right-0 top-full mt-1 bg-white border border-[var(--erp-border)] rounded-lg shadow-xl z-50 w-[calc(100vw-1rem)] sm:w-72 max-w-sm overflow-hidden">
                <div className="p-2.5 border-b border-[var(--erp-border)] text-[11px] font-bold text-[var(--erp-text-muted)] uppercase bg-[var(--erp-surface)]">
                  Quick Actions
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        action.action();
                        setShowQuickActions(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 text-sm hover:bg-[var(--erp-surface)] transition-colors border-b border-[var(--erp-border)] last:border-0"
                    >
                      <div className={`w-9 h-9 rounded-lg ${action.bgColor} flex items-center justify-center shrink-0`}>
                        <span className={`material-symbols-outlined !text-[20px] ${action.color}`}>{action.icon}</span>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-[var(--erp-text)] truncate">{action.label}</p>
                        <p className="text-[11px] text-[var(--erp-text-muted)] truncate">{action.description}</p>
                      </div>
                      {action.count > 0 && (
                        <span className="text-xs font-bold text-[var(--erp-accent)] bg-[var(--erp-accent)]/10 px-2 py-0.5 rounded-full">
                          {action.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={notificationsRef}>
            <button
              className={`p-1.5 sm:p-2 rounded transition-colors relative ${showNotifications ? 'bg-[var(--erp-surface-strong)]' : 'hover:bg-[var(--erp-surface)]'}`}
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
              <div className="absolute right-0 top-full mt-1 bg-white border border-[var(--erp-border)] rounded-lg shadow-xl z-50 w-[calc(100vw-1rem)] sm:w-96 max-w-md overflow-hidden">
                <div className="p-3 border-b border-[var(--erp-border)] flex items-center justify-between bg-[var(--erp-surface)]">
                  <span className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllNotificationsRead();
                      }}
                      className="text-[11px] text-[var(--erp-accent)] hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => {
                      const unread = !readNotificationIds.has(notification.id);
                      return (
                        <div
                          key={notification.id}
                          onClick={() => {
                            markNotificationRead(notification.id);
                            if (notification.action) {
                              notification.action();
                              setShowNotifications(false);
                            }
                          }}
                          className={`px-3 py-3 border-b border-[var(--erp-border)] last:border-0 hover:bg-[var(--erp-surface)] cursor-pointer transition-colors ${unread ? 'bg-[rgba(0,126,167,0.05)]' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              notification.type === 'rfq' ? 'bg-orange-50' :
                              notification.type === 'quote' ? 'bg-purple-50' :
                              notification.type === 'inbox' ? 'bg-blue-50' :
                              notification.type === 'stock' ? 'bg-red-50' :
                              'bg-gray-50'
                            }`}>
                              <span
                                className={`material-symbols-outlined !text-[18px] ${
                                  notification.type === 'rfq' ? 'text-orange-600' :
                                  notification.type === 'quote' ? 'text-purple-600' :
                                  notification.type === 'inbox' ? 'text-blue-600' :
                                  notification.type === 'stock' ? 'text-red-600' :
                                  'text-gray-600'
                                }`}
                              >
                                {notification.type === 'rfq'
                                  ? 'assignment'
                                  : notification.type === 'quote'
                                    ? 'receipt_long'
                                    : notification.type === 'inbox'
                                      ? 'mail'
                                      : notification.type === 'stock'
                                        ? 'inventory'
                                        : 'info'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm ${unread ? 'font-semibold text-[var(--erp-text)]' : 'text-[var(--erp-text)]'}`}>{notification.title}</p>
                                {unread && (
                                  <span className="w-2 h-2 bg-[var(--erp-accent)] rounded-full mt-1.5 shrink-0"></span>
                                )}
                              </div>
                              <p className="text-[12px] text-[var(--erp-text-muted)] mt-0.5 line-clamp-2">{notification.message}</p>
                              <p className="text-[10px] text-[var(--erp-text-muted)] mt-1 font-medium">{notification.time}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <span className="material-symbols-outlined text-[var(--erp-text-muted)] text-4xl mb-2">notifications_off</span>
                      <p className="text-sm text-[var(--erp-text-muted)]">No notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Date & calendar picker - hidden on small mobile */}
          <div className="relative hidden sm:flex items-center mx-1">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center gap-1.5 bg-[var(--erp-surface-strong)] px-2.5 py-1 rounded text-[12px]"
              aria-label="Select date"
            >
              <span className="material-symbols-outlined !text-[16px] text-[var(--erp-text-muted)]">calendar_today</span>
              <span className="font-medium text-[var(--erp-text)]">{currentDate}</span>
            </button>
            {showCalendar && (
              <div className="absolute right-0 top-full mt-2 z-50" ref={calendarRef}>
                <Calendar
                  selectedDate={selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d);
                    setShowCalendar(false);
                  }}
                  onClose={() => setShowCalendar(false)}
                />
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-1.5 bg-[rgba(0,167,225,0.12)] border border-[rgba(0,167,225,0.35)] px-2.5 py-1 rounded text-[11px] mx-1">
            <span className="material-symbols-outlined !text-[14px] text-[var(--erp-accent-strong)]">monitoring</span>
            <span className="font-semibold text-[var(--erp-accent)]">Today</span>
            <span className="text-[var(--erp-accent-strong)]">•</span>
            <span className="text-[var(--erp-accent)]">{todaysOrdersCount} Orders · {todaysInquiriesCount} Inquiries · {todaysFollowupsCount} Followups</span>
          </div>

          <Link
            to="/system-config"
            className={`hidden sm:flex p-2 rounded transition-colors ${isActive('/system-config') ? 'bg-[var(--erp-surface-strong)] text-[var(--erp-accent)]' : 'hover:bg-[var(--erp-surface)]'}`}
            title="Settings"
          >
            <span
              className={`material-symbols-outlined !text-xl ${isActive('/system-config') ? 'text-[var(--erp-accent)]' : 'text-[var(--erp-text-muted)]'}`}
            >
              settings
            </span>
          </Link>

          <div className="relative" ref={userMenuRef}>
            <button
              className={`flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 rounded transition-colors ${showUserMenu ? 'bg-[var(--erp-surface-strong)]' : 'hover:bg-[var(--erp-surface)]'}`}
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
                setShowQuickActions(false);
              }}
            >
              <div className="w-7 h-7 rounded-full bg-[var(--erp-accent)] flex items-center justify-center text-white font-bold text-sm">
                {userInitial}
              </div>
              <span className="material-symbols-outlined text-[var(--erp-text-muted)] !text-[18px] hidden sm:block">expand_more</span>
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[var(--erp-border)] rounded-lg shadow-xl z-50 w-[calc(100vw-1rem)] sm:w-56 max-w-xs overflow-hidden">
                <div className="p-3 border-b border-[var(--erp-border)] bg-[var(--erp-surface)]">
                  <p className="font-semibold text-sm text-[var(--erp-text)]">{user?.name || 'User'}</p>
                  <p className="text-[11px] text-[var(--erp-text-muted)] mt-0.5">{user?.role || 'Member'}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/user-permissions"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-[var(--erp-surface)] transition-colors"
                  >
                    <span className="material-symbols-outlined !text-[18px] text-[var(--erp-text-muted)]">person</span>
                    My Profile
                  </Link>
                  <Link
                    to="/system-config"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-[var(--erp-surface)] transition-colors"
                  >
                    <span className="material-symbols-outlined !text-[18px] text-[var(--erp-text-muted)]">tune</span>
                    Preferences
                  </Link>
                </div>
                <div className="border-t border-[var(--erp-border)] py-1">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--erp-accent)] hover:bg-[var(--erp-surface)] transition-colors"
                  >
                    <span className="material-symbols-outlined !text-[18px]">logout</span>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search row - shown only on <768px */}
      <div className="md:hidden px-2 pb-2" ref={searchRef}>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--erp-text-muted)] !text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            placeholder="Search... (Ctrl+K)"
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-[var(--erp-border)] rounded-lg bg-[var(--erp-surface)] focus:bg-white focus:ring-2 focus:ring-[var(--erp-accent)]/20 focus:border-[var(--erp-accent)] outline-none transition-all"
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
              <p className="text-sm text-[var(--erp-text-muted)]">No results found for &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
