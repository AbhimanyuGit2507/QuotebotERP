import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { apiRequest, downloadFromApi } from '../services/api';

export interface RFQLineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  notes?: string;
  availability?: 'matched' | 'rejected' | 'available' | 'insufficient_stock' | 'out_of_stock';
  availableQuantity?: number;
  reason?: string;
}

export interface RFQ {
  id: string;
  number: string;
  display_name?: string;
  date: string;
  client: string;
  clientId: string;
  items: number;
  itemDetails?: RFQLineItem[];
  value: string;
  status: 'pending' | 'draft' | 'quoted' | 'expired' | 'converted';
  channel: 'email' | 'whatsapp' | 'manual';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  notes?: string;
  quotationId?: string;
}

export interface QuoteItem {
  id: string;
  productId?: string;
  productName?: string;
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  rate: number;
  discount?: number;
  total: number;
  notes?: string;
  availability?: 'available' | 'insufficient_stock' | 'out_of_stock';
  availableQuantity?: number;
}

export interface Quote {
  id: string;
  number: string;
  display_name?: string;
  rfqNumber?: string;
  date: string;
  client: string;
  clientId: string;
  project?: string;
  items: QuoteItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
  validUntil: string;
  validity?: string;
  followUpDate?: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  number: string;
  display_name?: string;
  date: string;
  dueDate?: string;
  currency: string;
  total: number;
  status: 'open' | 'paid' | 'partial' | 'cancelled';
  paidAmount: number;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  basePrice: number;
  stock: number;
  minStock: number;
  unit: string;
  hsn?: string;
  gst: number;
  status: 'active' | 'inactive' | 'low_stock';
}

export interface Client {
  id: string;
  name: string;
  type: 'company' | 'individual';
  email: string;
  phone: string;
  website?: string;
  gst?: string;
  pan?: string;
  address: string;
  city: string;
  state: string;
  tier: 'new' | 'regular' | 'top';
  totalOrders: number;
  totalValue: number;
  createdAt: string;
  lastOrderAt?: string;
}

export interface PermissionEntry {
  module: string;
  fullAccess: boolean;
  view: boolean;
  create: boolean;
  alter: boolean;
  delete: boolean;
  print: boolean;
  special: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'sales' | 'viewer';
  department: string;
  status: 'online' | 'offline' | 'active' | 'inactive';
  avatar?: string;
  lastLogin: string;
  permissions?: { modules: PermissionEntry[] } | null;
}

export interface InboxMessage {
  id: string;
  channel: 'email' | 'whatsapp';
  sender: string;
  from?: string;
  subject: string;
  preview: string;
  content?: string;
  contentHtml?: string;
  timestamp: string;
  relativeTime?: string;
  status: 'new' | 'parsed' | 'needs_review' | 'duplicate' | 'failed';
  isRead: boolean;
  confidence: number;
  extractedItems: number;
  parsedItems?: Array<{
    product_name: string;
    quantity: number;
    unit?: string;
    notes?: string;
    status?: 'matched' | 'rejected';
    reason?: string;
    availability?: 'available' | 'insufficient_stock' | 'out_of_stock';
    availableQuantity?: number;
  }>;
  parsingSource?: string;
  parsingConfidence?: string;
  parsingError?: string;
  rfqId?: string;
  quotationId?: string;
  autoRfqCreated?: boolean;
  autoQuotationCreated?: boolean;
  retryCount?: number;
  lastRetryAt?: string;
  retryHistory?: Array<{
    retried_at: string;
    retried_by: string;
    reason: string;
    previous_processing_status: 'pending' | 'parsed' | 'failed';
    previous_parsing_source?: string;
    previous_parsing_error?: string;
    previous_item_count?: number;
    forced: boolean;
  }>;
  attachments?: string[];
}

export interface CompanySettings {
  currency: string;
  logoUrl?: string;
  displayName?: string;
  profile?: {
    displayName: string;
    legalName: string;
    tradingName: string;
    email: string;
    phone: string;
    website: string;
    gstin: string;
    pan: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    invoicePrefix: string;
    fiscalYearStart: string;
    bankName: string;
    bankAccountName: string;
    bankAccountNumber: string;
    bankIfsc: string;
  };
}

export interface NotificationSettings {
  newRfq: boolean;
  quoteSent: boolean;
  quoteViewed: boolean;
  quoteAccepted: boolean;
  quoteDeclined: boolean;
}

export interface TemplateSetting {
  id: string;
  key: string;
  content: string;
}

export interface AutomationRuleSetting {
  id: string;
  name: string;
  condition: string;
  action: string;
  active: boolean;
}

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ConfirmModalState {
  show: boolean;
  title: string;
  message: string;
  onConfirm: (choice?: any) => void;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
}

interface AppContextType {
  rfqs: RFQ[];
  quotes: Quote[];
  invoices: Invoice[];
  products: Product[];
  clients: Client[];
  users: User[];
  inboxMessages: InboxMessage[];
  categories: ProductCategory[];
  companySettings: CompanySettings;
  notificationSettings: NotificationSettings;
  templates: TemplateSetting[];
  automationRules: AutomationRuleSetting[];
  isLoading: boolean;
  refreshData: () => void;
  addRFQ: (rfq: Omit<RFQ, 'id'>) => void;
  updateRFQ: (id: string, data: Partial<RFQ>) => void;
  deleteRFQ: (id: string, options?: { forceDeleteLinkedQuotation?: boolean }) => void;
  convertRFQToQuote: (id: string) => void;
  addQuote: (quote: Omit<Quote, 'id'>) => void;
  updateQuote: (id: string, data: Partial<Quote>) => void;
  deleteQuote: (id: string, options?: { forceDeleteLinkedRfq?: boolean }) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addClient: (client: Omit<Client, 'id'>) => Promise<Client | void>;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  updateInboxMessage: (id: string, data: Partial<InboxMessage>) => void;
  updateCompanySettings: (data: Partial<CompanySettings>) => Promise<void>;
  updateNotificationSettings: (data: Partial<NotificationSettings>) => Promise<void>;
  createTemplate: (data: { key: string; content: string }) => Promise<void>;
  updateTemplate: (id: string, data: Partial<{ key: string; content: string }>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  createAutomationRule: (data: {
    name: string;
    condition: string;
    action: string;
    active?: boolean;
  }) => Promise<void>;
  updateAutomationRule: (
    id: string,
    data: Partial<{
      name: string;
      condition: string;
      action: string;
      active: boolean;
    }>,
  ) => Promise<void>;
  deleteAutomationRule: (id: string) => Promise<void>;
  downloadProductsCsv: (query?: { search?: string; category?: string; status?: string }) => void;
  downloadClientsCsv: (query?: { search?: string; tier?: string }) => void;
  downloadRfqsCsv: (query?: { search?: string; status?: string; channel?: string }) => void;
  downloadQuotationsCsv: (query?: { search?: string; status?: string }) => void;
  downloadQuotationPdf: (id: string) => void;
  downloadAnalyticsCsv: (report: string) => void;
  toast: ToastState;
  showToast: (message: string, type?: ToastState['type']) => void;
  hideToast: () => void;
  confirmModal: ConfirmModalState;
  showConfirmModal: (
    title: string,
    message: string,
    onConfirm: (choice?: any) => void,
    options?: { checkboxLabel?: string; checkboxDefault?: boolean },
  ) => void;
  hideConfirmModal: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const formatDate = (value?: string | Date | null) => {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const normalizeCompanyProfile = (
  profile: any,
  fallbackName: string,
): NonNullable<CompanySettings['profile']> => ({
  displayName: typeof profile?.displayName === 'string' ? profile.displayName : fallbackName,
  legalName: typeof profile?.legalName === 'string' ? profile.legalName : fallbackName,
  tradingName: typeof profile?.tradingName === 'string' ? profile.tradingName : '',
  email: typeof profile?.email === 'string' ? profile.email : '',
  phone: typeof profile?.phone === 'string' ? profile.phone : '',
  website: typeof profile?.website === 'string' ? profile.website : '',
  gstin: typeof profile?.gstin === 'string' ? profile.gstin : '',
  pan: typeof profile?.pan === 'string' ? profile.pan : '',
  addressLine1: typeof profile?.addressLine1 === 'string' ? profile.addressLine1 : '',
  addressLine2: typeof profile?.addressLine2 === 'string' ? profile.addressLine2 : '',
  city: typeof profile?.city === 'string' ? profile.city : '',
  state: typeof profile?.state === 'string' ? profile.state : '',
  country: typeof profile?.country === 'string' ? profile.country : 'India',
  pincode: typeof profile?.pincode === 'string' ? profile.pincode : '',
  invoicePrefix: typeof profile?.invoicePrefix === 'string' ? profile.invoicePrefix : 'INV',
  fiscalYearStart: typeof profile?.fiscalYearStart === 'string' ? profile.fiscalYearStart : 'April',
  bankName: typeof profile?.bankName === 'string' ? profile.bankName : '',
  bankAccountName: typeof profile?.bankAccountName === 'string' ? profile.bankAccountName : '',
  bankAccountNumber: typeof profile?.bankAccountNumber === 'string' ? profile.bankAccountNumber : '',
  bankIfsc: typeof profile?.bankIfsc === 'string' ? profile.bankIfsc : '',
});

const toQueryString = (query?: Record<string, string | undefined>) => {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

const mapRole = (role?: string): User['role'] => {
  if (role === 'admin' || role === 'manager') {
    return role;
  }

  if (role === 'viewer') {
    return 'viewer';
  }

  return 'sales';
};

const inferDepartment = (role: User['role']) => {
  switch (role) {
    case 'admin':
      return 'Management';
    case 'manager':
      return 'Operations';
    case 'viewer':
      return 'Finance';
    default:
      return 'Sales';
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    currency: 'INR',
    logoUrl: '',
    displayName: 'Quotebot',
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    newRfq: true,
    quoteSent: true,
    quoteViewed: true,
    quoteAccepted: true,
    quoteDeclined: true,
  });
  const [templates, setTemplates] = useState<TemplateSetting[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRuleSetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success',
  });
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    checkboxLabel: undefined,
    checkboxChecked: false,
  });

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, show: false }));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastState['type'] = 'success') => {
      setToast({ show: true, message, type });
      window.setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 3000);
    },
    [],
  );

  const showConfirmModal = useCallback(
    (
      title: string,
      message: string,
      onConfirm: (choice?: any) => void,
      options?: { checkboxLabel?: string; checkboxDefault?: boolean },
    ) => {
      setConfirmModal({
        show: true,
        title,
        message,
        onConfirm,
        checkboxLabel: options?.checkboxLabel,
        checkboxChecked: Boolean(options?.checkboxDefault),
      });
    },
    [],
  );

  const hideConfirmModal = useCallback(() => {
    setConfirmModal((prev) => ({ ...prev, show: false }));
  }, []);

  const mapProduct = useCallback((product: any): Product => {
    const price = Number(product.price || 0);
    const stock = Number(product.stock || 0);
    const minStock = Number(product.reorder_level || 0);
    const status =
      product.status === 'inactive'
        ? 'inactive'
        : stock <= minStock
          ? 'low_stock'
          : 'active';

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category?.name || '',
      price,
      basePrice: price,
      stock,
      minStock,
      unit: product.unit,
      hsn: product.hsn || '',
      gst: Number(product.gst_percent || 0),
      status,
    };
  }, []);

  const mapClient = useCallback((client: any): Client => {
    const backendTier = String(client.tier || 'regular').toLowerCase();
    const normalizedTier: Client['tier'] =
      backendTier === 'new'
        ? 'new'
        : backendTier === 'top' || backendTier === 'vip' || backendTier === 'gold'
          ? 'top'
          : 'regular';

    return {
      id: client.id,
      name: client.name,
      type: client.type === 'B2C' ? 'individual' : 'company',
      email: client.email,
      phone: client.phone || '',
      website: client.website || '',
      gst: client.gst || '',
      pan: client.pan || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      tier: normalizedTier,
      totalOrders: Number(client.total_orders || 0),
      totalValue: Number(client.total_value || 0),
      createdAt: formatDate(client.created_at),
      lastOrderAt: formatDate(client.last_order_date),
    };
  }, []);

  const mapQuote = useCallback((quotation: any): Quote => ({
    id: quotation.id,
    number: quotation.number,
    date: quotation.date,
    client: quotation.client?.name || '',
    clientId: quotation.client_id,
    items: (quotation.items || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      name: item.product_name,
      quantity: Number(item.quantity || 0),
      unit: item.unit,
      unitPrice: Number(item.unit_price || 0),
      rate: Number(item.unit_price || 0),
      total: Number(item.total || 0),
      ...(typeof item?.notes === 'string' && item.notes.trim().length > 0 ? { notes: item.notes.trim() } : {}),
      ...(typeof item?.availability === 'string' && item.availability.trim().length > 0
        ? { availability: item.availability.trim() as QuoteItem['availability'] }
        : {}),
      ...(Number.isFinite(Number(item?.available_quantity))
        ? { availableQuantity: Number(item.available_quantity) }
        : {}),
    })),
    subtotal: Number(quotation.subtotal || 0),
    tax: Number(quotation.tax || 0),
    total: Number(quotation.total || 0),
    status: (quotation.status || 'draft') as Quote['status'],
    validUntil: quotation.valid_until,
    notes: quotation.terms_conditions || '',
  }), []);

  const mapInvoice = useCallback((invoice: any): Invoice => ({
    id: invoice.id,
    number: invoice.number,
    date: formatDate(invoice.date) || invoice.date,
    dueDate: formatDate(invoice.due_date) || invoice.due_date || undefined,
    currency: invoice.currency || 'INR',
    total: Number(invoice.total || 0),
    status: (invoice.status || 'open') as Invoice['status'],
    paidAmount: Number(invoice.paid_amount || 0),
  }), []);

  const mapAuthUser = useCallback((): User | null => {
    if (!user) {
      return null;
    }

    const role = mapRole(user.role);
    return {
      id: user.id,
      username: user.email.split('@')[0],
      name: user.name,
      email: user.email,
      role,
      department: inferDepartment(role),
      status: 'active',
      lastLogin: 'Current session',
    };
  }, [user]);

  const mapUser = useCallback((backendUser: any): User => {
    const role = mapRole(backendUser.role?.name);
    return {
      id: backendUser.id,
      username: backendUser.email.split('@')[0],
      name: backendUser.name,
      email: backendUser.email,
      role,
      department: inferDepartment(role),
      status: backendUser.status === 'active' ? 'active' : 'inactive',
      lastLogin: formatDate(backendUser.updated_at) || 'Never',
      permissions: backendUser.permissions ?? null,
    };
  }, []);

  const mapInboxMessage = useCallback((message: any): InboxMessage => {
    const normalizedStatus: InboxMessage['status'] = [
      'new',
      'parsed',
      'needs_review',
      'duplicate',
      'failed',
    ].includes(message.status)
      ? message.status
      : 'new';

    const parsedItems = Array.isArray(message.parsedItems)
      ? message.parsedItems
          .map((item: any) => {
            const productName =
              typeof item?.product_name === 'string' && item.product_name.trim().length > 0
                ? item.product_name.trim()
                : typeof item?.name === 'string' && item.name.trim().length > 0
                  ? item.name.trim()
                  : '';
            const quantity = Number(item?.quantity);

            if (!productName || !Number.isFinite(quantity) || quantity <= 0) {
              return null;
            }

            return {
              product_name: productName,
              quantity,
              ...(typeof item?.status === 'string' && item.status.trim().length > 0
                ? { status: item.status.trim() as 'matched' | 'rejected' }
                : { status: 'matched' as const }),
              ...(typeof item?.reason === 'string' && item.reason.trim().length > 0
                ? { reason: item.reason.trim() }
                : {}),
              ...(typeof item?.unit === 'string' && item.unit.trim().length > 0
                ? { unit: item.unit.trim() }
                : {}),
              ...(typeof item?.notes === 'string' && item.notes.trim().length > 0
                ? { notes: item.notes.trim() }
                : {}),
              ...(typeof item?.availability === 'string' && item.availability.trim().length > 0
                ? { availability: item.availability.trim() as RFQLineItem['availability'] }
                : {}),
              ...(Number.isFinite(Number(item?.availableQuantity))
                ? { availableQuantity: Number(item.availableQuantity) }
                : {}),
            };
          })
          .filter(Boolean)
      : [];

    const retryHistory = Array.isArray(message.retryHistory)
      ? message.retryHistory
          .map((entry: any) => {
            const retriedAt =
              typeof entry?.retried_at === 'string' && entry.retried_at.trim().length > 0
                ? entry.retried_at.trim()
                : '';

            const previousProcessingStatus =
              entry?.previous_processing_status === 'pending' ||
              entry?.previous_processing_status === 'parsed' ||
              entry?.previous_processing_status === 'failed'
                ? entry.previous_processing_status
                : null;

            if (!retriedAt || !previousProcessingStatus) {
              return null;
            }

            const previousItemCount = Number(entry?.previous_item_count);

            return {
              retried_at: retriedAt,
              retried_by:
                typeof entry?.retried_by === 'string' && entry.retried_by.trim().length > 0
                  ? entry.retried_by.trim()
                  : 'manual_inbox_action',
              reason:
                typeof entry?.reason === 'string' && entry.reason.trim().length > 0
                  ? entry.reason.trim()
                  : 'Manual retry requested from inbox UI.',
              previous_processing_status: previousProcessingStatus,
              ...(typeof entry?.previous_parsing_source === 'string' &&
              entry.previous_parsing_source.trim().length > 0
                ? { previous_parsing_source: entry.previous_parsing_source.trim() }
                : {}),
              ...(typeof entry?.previous_parsing_error === 'string' &&
              entry.previous_parsing_error.trim().length > 0
                ? { previous_parsing_error: entry.previous_parsing_error.trim() }
                : {}),
              ...(Number.isFinite(previousItemCount) && previousItemCount >= 0
                ? { previous_item_count: Math.floor(previousItemCount) }
                : {}),
              forced: Boolean(entry?.forced),
            };
          })
          .filter(Boolean)
      : [];

    const retryCount = Number(message.retryCount || 0);
    const lastRetryAt =
      typeof message.lastRetryAt === 'string' && message.lastRetryAt.trim().length > 0
        ? message.lastRetryAt
        : retryHistory[0]?.retried_at || '';

    return {
      id: message.id,
      channel: message.channel === 'whatsapp' ? 'whatsapp' : 'email',
      sender: message.sender || message.from || 'Unknown sender',
      from: message.from || '',
      subject: message.subject || '(No subject)',
      preview: message.preview || message.content || '',
      content: message.content || message.preview || '',
      contentHtml:
        typeof message.contentHtml === 'string' && message.contentHtml.trim().length > 0
          ? message.contentHtml
          : '',
      timestamp: message.timestamp || formatDate(message.created_at) || 'Unknown',
      relativeTime:
        typeof message.relativeTime === 'string' && message.relativeTime.trim().length > 0
          ? message.relativeTime
          : '',
      status: normalizedStatus,
      isRead: Boolean(message.isRead),
      confidence: Number(message.confidence || 0),
      extractedItems: Number(message.extractedItems || parsedItems.length || 0),
      parsedItems,
      parsingSource:
        typeof message.parsingSource === 'string' && message.parsingSource.trim().length > 0
          ? message.parsingSource
          : '',
      parsingConfidence:
        typeof message.parsingConfidence === 'string' && message.parsingConfidence.trim().length > 0
          ? message.parsingConfidence
          : '',
      parsingError:
        typeof message.parsingError === 'string' && message.parsingError.trim().length > 0
          ? message.parsingError
          : '',
      rfqId:
        typeof message.rfqId === 'string' && message.rfqId.trim().length > 0
          ? message.rfqId
          : '',
      quotationId:
        typeof message.quotationId === 'string' && message.quotationId.trim().length > 0
          ? message.quotationId
          : '',
      autoRfqCreated: Boolean(message.autoRfqCreated),
      autoQuotationCreated: Boolean(message.autoQuotationCreated),
      retryCount: Number.isFinite(retryCount) && retryCount >= 0 ? Math.floor(retryCount) : 0,
      lastRetryAt,
      retryHistory,
      attachments: Array.isArray(message.attachments) ? message.attachments : [],
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setIsLoading(true);

    try {
      const [
        backendProducts,
        backendCategories,
        backendClients,
        backendRfqs,
        backendQuotes,
        backendInboxMessages,
        backendInvoices,
      ] =
        await Promise.all([
          apiRequest<any[]>('/products'),
          apiRequest<any[]>('/products/categories'),
          apiRequest<any[]>('/clients'),
          apiRequest<any[]>('/rfqs'),
          apiRequest<any[]>('/quotations'),
          apiRequest<any[]>('/inbox/messages'),
          apiRequest<any[]>('/invoices'),
        ]);

      const [backendCompany, backendNotifications, backendTemplates, backendAutomationRules] =
        await Promise.all([
          apiRequest<any>('/settings/company'),
          apiRequest<any>('/settings/notifications'),
          apiRequest<any[]>('/settings/templates'),
          apiRequest<any[]>('/settings/automation-rules'),
        ]);

      const mappedProducts = backendProducts.map(mapProduct);
      const mappedClients = backendClients.map(mapClient);
      const productById = new Map(mappedProducts.map((product) => [product.id, product]));

      const mappedRfqs: RFQ[] = backendRfqs.map((rfq) => {
        const itemDetails: RFQLineItem[] = (rfq.items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          quantity: Number(item.quantity || 0),
          unit: item.unit,
          notes: item.notes || '',
          availability: item.availability || undefined,
          availableQuantity: Number.isFinite(Number(item.available_quantity))
            ? Number(item.available_quantity)
            : undefined,
        }));
        const estimatedValue = itemDetails.reduce((sum, item) => {
          const product = productById.get(item.productId);
          return sum + (product?.price || 0) * item.quantity;
        }, 0);

        return {
          id: rfq.id,
          number: rfq.number,
          date: formatDate(rfq.created_at),
          client: rfq.client?.name || '',
          clientId: rfq.client_id,
          items: itemDetails.length,
          itemDetails,
          value: estimatedValue ? formatCurrency(estimatedValue) : '₹0',
          status: rfq.status === 'spam' ? 'expired' : (rfq.status as RFQ['status']),
          channel: rfq.channel as RFQ['channel'],
          priority: rfq.priority as RFQ['priority'],
          dueDate: formatDate(rfq.due_date),
          notes: itemDetails.map((item) => item.notes).filter(Boolean).join(', '),
          quotationId: rfq.quotation?.id || rfq.quotation_id || undefined,
        };
      });

      setProducts(mappedProducts);
      setCategories(backendCategories.map((category) => ({ id: category.id, name: category.name })));
      setClients(mappedClients);
      setRFQs(mappedRfqs);
      setQuotes(backendQuotes.map(mapQuote));
      setInvoices((backendInvoices || []).map(mapInvoice));
      const fallbackCompanyName = user?.company_name || 'Quotebot';
      const normalizedProfile = normalizeCompanyProfile(
        backendCompany?.profile_json,
        fallbackCompanyName,
      );
      setCompanySettings({
        currency: backendCompany?.currency || 'INR',
        logoUrl: backendCompany?.logo_url || '',
        displayName: normalizedProfile.displayName,
        profile: normalizedProfile,
      });
      setNotificationSettings({
        newRfq: Boolean(backendNotifications?.new_rfq),
        quoteSent: Boolean(backendNotifications?.quote_sent),
        quoteViewed: Boolean(backendNotifications?.quote_viewed),
        quoteAccepted: Boolean(backendNotifications?.quote_accepted),
        quoteDeclined: Boolean(backendNotifications?.quote_declined),
      });
      setTemplates(
        (backendTemplates || []).map((template) => ({
          id: template.id,
          key: template.template_key,
          content: template.content,
        })),
      );
      setAutomationRules(
        (backendAutomationRules || []).map((rule) => ({
          id: rule.id,
          name: rule.name,
          condition: rule.condition,
          action: rule.action,
          active: Boolean(rule.active),
        })),
      );

      try {
        const backendUsers = await apiRequest<any[]>('/users');
        setUsers(backendUsers.map(mapUser));
      } catch {
        const currentUser = mapAuthUser();
        setUsers(currentUser ? [currentUser] : []);
      }

      setInboxMessages((backendInboxMessages || []).map(mapInboxMessage));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to load ERP data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [
    isAuthenticated,
    mapAuthUser,
    mapClient,
    mapInboxMessage,
    mapProduct,
    mapQuote,
    mapInvoice,
    mapUser,
    showToast,
    user?.company_name,
  ]);

  const fetchInboxMessages = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const backendInboxMessages = await apiRequest<any[]>('/inbox/messages');
      setInboxMessages((backendInboxMessages || []).map(mapInboxMessage));
    } catch {
      // Ignore transient inbox polling failures
    }
  }, [isAuthenticated, mapInboxMessage]);

  useEffect(() => {
    if (!isAuthenticated) {
      setRFQs([]);
      setQuotes([]);
      setInvoices([]);
      setProducts([]);
      setClients([]);
      setUsers([]);
      setCategories([]);
      setInboxMessages([]);
      setTemplates([]);
      setAutomationRules([]);
      setIsLoading(false);
      return;
    }

    void loadData();
  }, [isAuthenticated, loadData]);

  // Poll inbox messages periodically to reflect backend processing status changes
  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    const interval = window.setInterval(() => {
      if (!mounted) return;
      void fetchInboxMessages();
    }, 5000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, fetchInboxMessages]);

  // allow other pages to request a refresh via a window event
  useEffect(() => {
    const handler = () => {
      void loadData();
    };
    window.addEventListener('quotebot-refresh-data', handler);
    return () => window.removeEventListener('quotebot-refresh-data', handler);
  }, [loadData]);

  const refreshData = useCallback(() => {
    void loadData();
  }, [loadData]);

  const resolveCategoryId = useCallback(
    (categoryName?: string) => {
      const category = categories.find(
        (item) => item.name.toLowerCase() === (categoryName || '').trim().toLowerCase(),
      );

      if (!category) {
        throw new Error('Select an existing product category from the backend list');
      }

      return category.id;
    },
    [categories],
  );

  const resolveProductId = useCallback(
    (productName?: string, productId?: string) => {
      const directMatch = products.find((product) => product.id === productId);
      if (directMatch) {
        return directMatch.id;
      }

      const byName = products.find(
        (product) => product.name.toLowerCase() === (productName || '').trim().toLowerCase(),
      );
      if (!byName) {
        throw new Error('Each line item must match an existing product');
      }

      return byName.id;
    },
    [products],
  );

  const buildRfqItems = useCallback(
    (itemDetails?: RFQLineItem[]) => {
      if (!itemDetails || itemDetails.length === 0) {
        throw new Error('Add at least one RFQ line item');
      }

      return itemDetails.map((item) => ({
        product_id: resolveProductId(item.productName, item.productId),
        product_name: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        ...(item.notes ? { notes: item.notes } : {}),
      }));
    },
    [resolveProductId],
  );

  const buildQuotationItems = useCallback(
    (items: QuoteItem[]) => {
      if (!items.length) {
        throw new Error('Add at least one quotation item');
      }

      return items.map((item) => ({
        product_id: resolveProductId(item.name, item.productId),
        product_name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.rate,
        tax_percent: 18,
      }));
    },
    [resolveProductId],
  );

  const addProduct = useCallback(
    (product: Omit<Product, 'id'>) => {
      void (async () => {
        try {
          const created = await apiRequest<any>('/products', {
            method: 'POST',
            body: JSON.stringify({
              sku: product.sku,
              name: product.name,
              category_id: resolveCategoryId(product.category),
              unit: product.unit,
              price: product.price,
              cost: product.basePrice || product.price,
              stock: product.stock,
              reorder_level: product.minStock,
              hsn: product.hsn,
              gst_percent: product.gst,
              status: product.status === 'inactive' ? 'inactive' : 'active',
            }),
          });

          setProducts((prev) => [mapProduct(created), ...prev]);
          showToast('Product added successfully');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to add product', 'error');
        }
      })();
    },
    [mapProduct, resolveCategoryId, showToast],
  );

  const updateProduct = useCallback(
    (id: string, data: Partial<Product>) => {
      void (async () => {
        try {
          const updated = await apiRequest<any>(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              ...(data.sku ? { sku: data.sku } : {}),
              ...(data.name ? { name: data.name } : {}),
              ...(data.category ? { category_id: resolveCategoryId(data.category) } : {}),
              ...(data.unit ? { unit: data.unit } : {}),
              ...(data.price !== undefined ? { price: data.price, cost: data.basePrice || data.price } : {}),
              ...(data.stock !== undefined ? { stock: data.stock } : {}),
              ...(data.minStock !== undefined ? { reorder_level: data.minStock } : {}),
              ...(data.hsn !== undefined ? { hsn: data.hsn } : {}),
              ...(data.gst !== undefined ? { gst_percent: data.gst } : {}),
              ...(data.status ? { status: data.status === 'inactive' ? 'inactive' : 'active' } : {}),
            }),
          });

          setProducts((prev) => prev.map((product) => (product.id === id ? mapProduct(updated) : product)));
          showToast('Product updated successfully');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to update product', 'error');
        }
      })();
    },
    [mapProduct, resolveCategoryId, showToast],
  );

  const deleteProduct = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await apiRequest(`/products/${id}`, { method: 'DELETE' });
          setProducts((prev) => prev.filter((product) => product.id !== id));
          showToast('Product deleted');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to delete product', 'error');
        }
      })();
    },
    [showToast],
  );

  const addClient = useCallback(
    (client: Omit<Client, 'id'>) => {
      return (async () => {
        try {
          const created = await apiRequest<any>('/clients', {
            method: 'POST',
            body: JSON.stringify({
              name: client.name,
              type: client.type === 'individual' ? 'B2C' : 'B2B',
              email: client.email,
              phone: client.phone,
              website: client.website,
              address: client.address,
              city: client.city,
              state: client.state,
              gst: client.gst,
              pan: client.pan,
              tier: client.tier,
            }),
          });

          const mappedClient = mapClient(created);
          setClients((prev) => [mappedClient, ...prev]);
          showToast('Client added successfully');
          return mappedClient;
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to add client', 'error');
          return undefined;
        }
      })();
    },
    [mapClient, showToast],
  );

  const updateClient = useCallback(
    (id: string, data: Partial<Client>) => {
      void (async () => {
        try {
          const updated = await apiRequest<any>(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              ...(data.name ? { name: data.name } : {}),
              ...(data.type ? { type: data.type === 'individual' ? 'B2C' : 'B2B' } : {}),
              ...(data.email ? { email: data.email } : {}),
              ...(data.phone !== undefined ? { phone: data.phone } : {}),
              ...(data.address !== undefined ? { address: data.address } : {}),
              ...(data.city !== undefined ? { city: data.city } : {}),
              ...(data.state !== undefined ? { state: data.state } : {}),
              ...(data.gst !== undefined ? { gst: data.gst } : {}),
              ...(data.tier ? { tier: data.tier } : {}),
            }),
          });

          setClients((prev) => prev.map((client) => (client.id === id ? mapClient(updated) : client)));
          showToast('Client updated successfully');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to update client', 'error');
        }
      })();
    },
    [mapClient, showToast],
  );

  const deleteClient = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await apiRequest(`/clients/${id}`, { method: 'DELETE' });
          setClients((prev) => prev.filter((client) => client.id !== id));
          showToast('Client deleted');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to delete client', 'error');
        }
      })();
    },
    [showToast],
  );

  const addRFQ = useCallback(
    (rfq: Omit<RFQ, 'id'>) => {
      void (async () => {
        try {
          await apiRequest('/rfqs', {
            method: 'POST',
            body: JSON.stringify({
              client_id: rfq.clientId,
              channel: rfq.channel,
              priority: rfq.priority,
              status: rfq.status === 'draft' ? 'pending' : rfq.status,
              due_date: rfq.dueDate || undefined,
              items: buildRfqItems(rfq.itemDetails),
            }),
          });

          await loadData();
          showToast('RFQ created successfully');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to create RFQ', 'error');
        }
      })();
    },
    [buildRfqItems, loadData, showToast],
  );

  const updateRFQ = useCallback(
    (id: string, data: Partial<RFQ>) => {
      void (async () => {
        try {
          await apiRequest(`/rfqs/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              ...(data.clientId ? { client_id: data.clientId } : {}),
              ...(data.channel ? { channel: data.channel } : {}),
              ...(data.priority ? { priority: data.priority } : {}),
              ...(data.status ? { status: data.status === 'draft' ? 'pending' : data.status } : {}),
              ...(data.dueDate !== undefined ? { due_date: data.dueDate || null } : {}),
              ...(data.itemDetails ? { items: buildRfqItems(data.itemDetails) } : {}),
            }),
          });

          await loadData();
          showToast('RFQ updated successfully');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to update RFQ', 'error');
        }
      })();
    },
    [buildRfqItems, loadData, showToast],
  );

  const deleteRFQ = useCallback(
    (id: string, options?: { forceDeleteLinkedQuotation?: boolean }) => {
      void (async () => {
        try {
          const query = options?.forceDeleteLinkedQuotation ? '?forceDeleteLinkedQuotation=true' : '';
          await apiRequest(`/rfqs/${id}${query}`, { method: 'DELETE' });
          setRFQs((prev) => prev.filter((rfq) => rfq.id !== id));
          showToast('RFQ deleted');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to delete RFQ', 'error');
        }
      })();
    },
    [showToast],
  );

  const convertRFQToQuote = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await apiRequest(`/rfqs/${id}/convert-to-quotation`, { method: 'POST' });
          await loadData();
          showToast('RFQ converted to quotation');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to convert RFQ', 'error');
        }
      })();
    },
    [loadData, showToast],
  );

  const addQuote = useCallback(
    (quote: Omit<Quote, 'id'>) => {
      void (async () => {
        try {
          let clientId = quote.clientId;
          if (!clientId) {
            const clientName = (quote.client || '').trim();
            if (!clientName) {
              throw new Error('Client is required to create a quotation');
            }

            const createdClient = await apiRequest<any>('/clients', {
              method: 'POST',
              body: JSON.stringify({
                name: clientName,
                type: 'B2B',
                email: '',
                phone: '',
                address: '',
                city: '',
                state: '',
                gst: '',
                tier: 'regular',
              }),
            });

            clientId = createdClient?.id;
            if (!clientId) {
              throw new Error('Failed to create client for quotation');
            }
          }

          await apiRequest('/quotations', {
            method: 'POST',
            body: JSON.stringify({
              client_id: clientId,
              date: quote.date,
              valid_until: quote.validUntil,
              status: ['draft', 'sent', 'accepted', 'declined'].includes(quote.status)
                ? quote.status
                : 'draft',
              terms_conditions: quote.notes,
              items: buildQuotationItems(quote.items),
            }),
          });

          await loadData();
          showToast('Quotation created successfully');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to create quotation', 'error');
        }
      })();
    },
    [buildQuotationItems, loadData, showToast],
  );

  const updateQuote = useCallback(
    (id: string, data: Partial<Quote>) => {
      void (async () => {
        try {
          if (Object.keys(data).length === 1 && data.status) {
            await apiRequest(`/quotations/${id}/status`, {
              method: 'PUT',
              body: JSON.stringify({
                status: ['draft', 'sent', 'accepted', 'declined'].includes(data.status)
                  ? data.status
                  : 'draft',
              }),
            });
          } else {
            await apiRequest(`/quotations/${id}`, {
              method: 'PUT',
              body: JSON.stringify({
                ...(data.clientId ? { client_id: data.clientId } : {}),
                ...(data.date ? { date: data.date } : {}),
                ...(data.validUntil ? { valid_until: data.validUntil } : {}),
                ...(data.status
                  ? {
                      status: ['draft', 'sent', 'accepted', 'declined'].includes(data.status)
                        ? data.status
                        : 'draft',
                    }
                  : {}),
                ...(data.notes !== undefined ? { terms_conditions: data.notes } : {}),
                ...(data.items ? { items: buildQuotationItems(data.items) } : {}),
              }),
            });
          }

          await loadData();
          showToast('Quotation updated successfully');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to update quotation', 'error');
        }
      })();
    },
    [buildQuotationItems, loadData, showToast],
  );

  const deleteQuote = useCallback(
    (id: string, options?: { forceDeleteLinkedRfq?: boolean }) => {
      void (async () => {
        try {
          const query = options?.forceDeleteLinkedRfq ? '?forceDeleteLinkedRfq=true' : '';
          await apiRequest(`/quotations/${id}${query}`, { method: 'DELETE' });
          setQuotes((prev) => prev.filter((quote) => quote.id !== id));
          showToast('Quotation deleted');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to delete quotation', 'error');
        }
      })();
    },
    [showToast],
  );

  const addUser = useCallback(
    (newUser: Omit<User, 'id'>) => {
      void (async () => {
        try {
          const created = await apiRequest<any>('/users', {
            method: 'POST',
            body: JSON.stringify({
              email: newUser.email,
              name: newUser.name || newUser.username,
              password: 'User@123',
              role: newUser.role === 'admin' || newUser.role === 'manager' ? newUser.role : 'user',
              status: newUser.status === 'inactive' ? 'inactive' : 'active',
            }),
          });

          setUsers((prev) => [mapUser(created), ...prev]);
          showToast('User added successfully. Default password: User@123');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to add user', 'error');
        }
      })();
    },
    [mapUser, showToast],
  );

  const updateUser = useCallback(
    (id: string, data: Partial<User>) => {
      void (async () => {
        try {
          const updated = await apiRequest<any>(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              ...(data.email ? { email: data.email } : {}),
              ...(data.name || data.username ? { name: data.name || data.username } : {}),
              ...(data.role
                ? { role: data.role === 'admin' || data.role === 'manager' ? data.role : 'user' }
                : {}),
              ...(data.status ? { status: data.status === 'inactive' ? 'inactive' : 'active' } : {}),
              ...(data.permissions !== undefined ? { permissions: data.permissions } : {}),
            }),
          });

          setUsers((prev) => prev.map((userItem) => (userItem.id === id ? mapUser(updated) : userItem)));
          showToast('User updated successfully');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to update user', 'error');
        }
      })();
    },
    [mapUser, showToast],
  );

  const deleteUser = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await apiRequest(`/users/${id}`, { method: 'DELETE' });
          setUsers((prev) => prev.filter((userItem) => userItem.id !== id));
          showToast('User deleted');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to delete user', 'error');
        }
      })();
    },
    [showToast],
  );

  const updateInboxMessage = useCallback((id: string, data: Partial<InboxMessage>) => {
    setInboxMessages((prev) => prev.map((message) => (message.id === id ? { ...message, ...data } : message)));
  }, []);

  const updateCompanySettings = useCallback(
    async (data: Partial<CompanySettings>) => {
      const fallbackCompanyName = user?.company_name || companySettings.displayName || 'Quotebot';
      const updated = await apiRequest<any>('/settings/company', {
        method: 'PUT',
        body: JSON.stringify({
          ...(data.currency ? { currency: data.currency } : {}),
          ...(data.logoUrl && String(data.logoUrl).trim().length > 0 ? { logo_url: data.logoUrl } : {}),
          ...(data.profile ? { profile_json: data.profile } : {}),
        }),
      });

      const normalizedProfile = normalizeCompanyProfile(
        updated?.profile_json ?? data.profile,
        fallbackCompanyName,
      );

      setCompanySettings({
        currency: updated?.currency || companySettings.currency,
        logoUrl: updated?.logo_url || '',
        displayName: normalizedProfile.displayName,
        profile: normalizedProfile,
      });
    },
    [companySettings.currency, companySettings.displayName, user?.company_name],
  );

  const updateNotificationSettings = useCallback(
    async (data: Partial<NotificationSettings>) => {
      const updated = await apiRequest<any>('/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify({
          ...(data.newRfq !== undefined ? { new_rfq: data.newRfq } : {}),
          ...(data.quoteSent !== undefined ? { quote_sent: data.quoteSent } : {}),
          ...(data.quoteViewed !== undefined ? { quote_viewed: data.quoteViewed } : {}),
          ...(data.quoteAccepted !== undefined
            ? { quote_accepted: data.quoteAccepted }
            : {}),
          ...(data.quoteDeclined !== undefined
            ? { quote_declined: data.quoteDeclined }
            : {}),
        }),
      });

      setNotificationSettings({
        newRfq: Boolean(updated?.new_rfq),
        quoteSent: Boolean(updated?.quote_sent),
        quoteViewed: Boolean(updated?.quote_viewed),
        quoteAccepted: Boolean(updated?.quote_accepted),
        quoteDeclined: Boolean(updated?.quote_declined),
      });
    },
    [],
  );

  const createTemplate = useCallback(
    async (data: { key: string; content: string }) => {
      const created = await apiRequest<any>('/settings/templates', {
        method: 'POST',
        body: JSON.stringify({
          template_key: data.key,
          content: data.content,
        }),
      });

      setTemplates((prev) => {
        const next = prev.filter((item) => item.id !== created.id);
        return [
          {
            id: created.id,
            key: created.template_key,
            content: created.content,
          },
          ...next,
        ];
      });
    },
    [],
  );

  const updateTemplate = useCallback(
    async (id: string, data: Partial<{ key: string; content: string }>) => {
      await apiRequest(`/settings/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...(data.key ? { template_key: data.key } : {}),
          ...(data.content !== undefined ? { content: data.content } : {}),
        }),
      });

      setTemplates((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...(data.key ? { key: data.key } : {}),
                ...(data.content !== undefined ? { content: data.content } : {}),
              }
            : item,
        ),
      );
    },
    [],
  );

  const deleteTemplate = useCallback(async (id: string) => {
    await apiRequest(`/settings/templates/${id}`, { method: 'DELETE' });
    setTemplates((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const createAutomationRule = useCallback(
    async (data: {
      name: string;
      condition: string;
      action: string;
      active?: boolean;
    }) => {
      const created = await apiRequest<any>('/settings/automation-rules', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          condition: data.condition,
          action: data.action,
          ...(data.active !== undefined ? { active: data.active } : {}),
        }),
      });

      setAutomationRules((prev) => [
        {
          id: created.id,
          name: created.name,
          condition: created.condition,
          action: created.action,
          active: Boolean(created.active),
        },
        ...prev,
      ]);
    },
    [],
  );

  const updateAutomationRule = useCallback(
    async (
      id: string,
      data: Partial<{
        name: string;
        condition: string;
        action: string;
        active: boolean;
      }>,
    ) => {
      await apiRequest(`/settings/automation-rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      setAutomationRules((prev) =>
        prev.map((rule) => (rule.id === id ? { ...rule, ...data } : rule)),
      );
    },
    [],
  );

  const deleteAutomationRule = useCallback(async (id: string) => {
    await apiRequest(`/settings/automation-rules/${id}`, { method: 'DELETE' });
    setAutomationRules((prev) => prev.filter((rule) => rule.id !== id));
  }, []);

  const downloadProductsCsv = useCallback(
    (query?: { search?: string; category?: string; status?: string }) => {
      void downloadFromApi({
        path: `/products/export/csv${toQueryString(query)}`,
        fileName: 'products-export.csv',
      }).catch((error) => showToast(error instanceof Error ? error.message : 'Download failed', 'error'));
    },
    [showToast],
  );

  const downloadClientsCsv = useCallback(
    (query?: { search?: string; tier?: string }) => {
      void downloadFromApi({
        path: `/clients/export/csv${toQueryString(query)}`,
        fileName: 'clients-export.csv',
      }).catch((error) => showToast(error instanceof Error ? error.message : 'Download failed', 'error'));
    },
    [showToast],
  );

  const downloadRfqsCsv = useCallback(
    (query?: { search?: string; status?: string; channel?: string }) => {
      void downloadFromApi({
        path: `/rfqs/export/csv${toQueryString(query)}`,
        fileName: 'rfqs-export.csv',
      }).catch((error) => showToast(error instanceof Error ? error.message : 'Download failed', 'error'));
    },
    [showToast],
  );

  const downloadQuotationsCsv = useCallback(
    (query?: { search?: string; status?: string }) => {
      void downloadFromApi({
        path: `/quotations/export/csv${toQueryString(query)}`,
        fileName: 'quotations-export.csv',
      }).catch((error) => showToast(error instanceof Error ? error.message : 'Download failed', 'error'));
    },
    [showToast],
  );

  const downloadQuotationPdf = useCallback(
    (id: string) => {
      void downloadFromApi({
        path: `/quotations/${id}/pdf`,
        fileName: `quotation-${id}.pdf`,
      }).catch((error) => showToast(error instanceof Error ? error.message : 'Download failed', 'error'));
    },
    [showToast],
  );

  const downloadAnalyticsCsv = useCallback(
    (report: string) => {
      void downloadFromApi({
        path: `/analytics/${report}/csv`,
        fileName: `analytics-${report}.csv`,
      }).catch((error) => showToast(error instanceof Error ? error.message : 'Download failed', 'error'));
    },
    [showToast],
  );

  const value = useMemo(
    () => ({
      rfqs,
      quotes,
      invoices,
      products,
      clients,
      users,
      inboxMessages,
      categories,
      companySettings,
      notificationSettings,
      templates,
      automationRules,
      isLoading,
      refreshData,
      addRFQ,
      updateRFQ,
      deleteRFQ,
      convertRFQToQuote,
      addQuote,
      updateQuote,
      deleteQuote,
      addProduct,
      updateProduct,
      deleteProduct,
      addClient,
      updateClient,
      deleteClient,
      addUser,
      updateUser,
      deleteUser,
      updateInboxMessage,
      updateCompanySettings,
      updateNotificationSettings,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      createAutomationRule,
      updateAutomationRule,
      deleteAutomationRule,
      downloadProductsCsv,
      downloadClientsCsv,
      downloadRfqsCsv,
      downloadQuotationsCsv,
      downloadQuotationPdf,
      downloadAnalyticsCsv,
      toast,
      showToast,
      hideToast,
      confirmModal,
      showConfirmModal,
      hideConfirmModal,
    }),
    [
      addClient,
      addProduct,
      addQuote,
      addRFQ,
      addUser,
      automationRules,
      categories,
      clients,
      companySettings,
      confirmModal,
      createAutomationRule,
      createTemplate,
      convertRFQToQuote,
      deleteClient,
      deleteAutomationRule,
      deleteProduct,
      deleteQuote,
      deleteRFQ,
      deleteTemplate,
      deleteUser,
      downloadAnalyticsCsv,
      downloadClientsCsv,
      downloadProductsCsv,
      downloadQuotationPdf,
      downloadQuotationsCsv,
      downloadRfqsCsv,
      hideConfirmModal,
      hideToast,
      inboxMessages,
      isLoading,
      invoices,
      notificationSettings,
      products,
      quotes,
      refreshData,
      rfqs,
      showConfirmModal,
      showToast,
      templates,
      toast,
      updateAutomationRule,
      updateClient,
      updateCompanySettings,
      updateInboxMessage,
      updateNotificationSettings,
      updateProduct,
      updateQuote,
      updateRFQ,
      updateTemplate,
      updateUser,
      users,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      {children}

      {toast.show ? (
        <div
          className={`fixed bottom-4 right-4 z-[100] animate-slide-up px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toast.type === 'error'
                ? 'bg-red-600 text-white'
                : toast.type === 'warning'
                  ? 'bg-amber-500 text-white'
                  : 'bg-blue-600 text-white'
          }`}
        >
          <span className="material-symbols-outlined">
            {toast.type === 'success'
              ? 'check_circle'
              : toast.type === 'error'
                ? 'error'
                : toast.type === 'warning'
                  ? 'warning'
                  : 'info'}
          </span>
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={hideToast} className="ml-2 hover:bg-white/20 rounded p-0.5">
            <span className="material-symbols-outlined !text-[18px]">close</span>
          </button>
        </div>
      ) : null}

      {confirmModal.show ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={hideConfirmModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-600">delete</span>
                </div>
                <h3 className="text-lg font-bold text-[var(--erp-text)]">{confirmModal.title}</h3>
              </div>
              <p className="text-sm text-[var(--erp-text-muted)]">{confirmModal.message}</p>
              {confirmModal.checkboxLabel ? (
                <div className="mt-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(confirmModal.checkboxChecked)}
                      onChange={(e) =>
                        setConfirmModal((prev) => ({ ...prev, checkboxChecked: e.target.checked }))
                      }
                    />
                    <span className="text-[var(--erp-text-muted)]">{confirmModal.checkboxLabel}</span>
                  </label>
                </div>
              ) : null}

              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={hideConfirmModal}
                  className="btn btn-secondary btn-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    try {
                      confirmModal.onConfirm(confirmModal.checkboxChecked);
                    } finally {
                      hideConfirmModal();
                    }
                  }}
                  className="btn btn-danger btn-md"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export default AppContext;
