export const PERMISSIONS = {
  // Quotations
  QUOTATION_VIEW: 'quotation:view',
  QUOTATION_CREATE: 'quotation:create',
  QUOTATION_EDIT: 'quotation:edit',
  QUOTATION_DELETE: 'quotation:delete',
  QUOTATION_APPROVE: 'quotation:approve',
  QUOTATION_SEND: 'quotation:send',

  // RFQs
  RFQ_VIEW: 'rfq:view',
  RFQ_CREATE: 'rfq:create',
  RFQ_EDIT: 'rfq:edit',
  RFQ_DELETE: 'rfq:delete',

  // Invoices
  INVOICE_VIEW: 'invoice:view',
  INVOICE_CREATE: 'invoice:create',
  INVOICE_EDIT: 'invoice:edit',
  INVOICE_DELETE: 'invoice:delete',

  // Products
  PRODUCT_VIEW: 'product:view',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_EDIT: 'product:edit',
  PRODUCT_DELETE: 'product:delete',

  // Clients
  CLIENT_VIEW: 'client:view',
  CLIENT_CREATE: 'client:create',
  CLIENT_EDIT: 'client:edit',
  CLIENT_DELETE: 'client:delete',

  // Orders/POs
  ORDER_VIEW: 'order:view',
  ORDER_CREATE: 'order:create',
  ORDER_EDIT: 'order:edit',
  ORDER_APPROVE: 'order:approve',

  // Payments
  PAYMENT_VIEW: 'payment:view',
  PAYMENT_CREATE: 'payment:create',

  // Analytics & Reports
  ANALYTICS_VIEW: 'analytics:view',
  REPORT_EXPORT: 'report:export',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',

  // Users & Roles
  USER_MANAGE: 'user:manage',
  ROLE_MANAGE: 'role:manage',

  // Audit
  AUDIT_VIEW: 'audit:view',

  // Accounting
  ACCOUNTING_VIEW: 'accounting:view',
  ACCOUNTING_CREATE: 'accounting:create',
  ACCOUNTING_EDIT: 'accounting:edit',

  // Suppliers
  SUPPLIER_VIEW: 'supplier:view',
  SUPPLIER_CREATE: 'supplier:create',
  SUPPLIER_EDIT: 'supplier:edit',
  SUPPLIER_DELETE: 'supplier:delete',

  // Purchase Orders
  PURCHASE_ORDER_VIEW: 'purchase_order:view',
  PURCHASE_ORDER_CREATE: 'purchase_order:create',
  PURCHASE_ORDER_EDIT: 'purchase_order:edit',

  // Inventory
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_ADJUST: 'inventory:adjust',

  // Currency
  CURRENCY_VIEW: 'currency:view',
  CURRENCY_EDIT: 'currency:edit',
} as const;

export const PERMISSION_GROUPS: Record<string, string[]> = {
  Quotations: [
    'quotation:view',
    'quotation:create',
    'quotation:edit',
    'quotation:delete',
    'quotation:approve',
    'quotation:send',
  ],
  RFQs: ['rfq:view', 'rfq:create', 'rfq:edit', 'rfq:delete'],
  Invoices: [
    'invoice:view',
    'invoice:create',
    'invoice:edit',
    'invoice:delete',
  ],
  Products: [
    'product:view',
    'product:create',
    'product:edit',
    'product:delete',
  ],
  Clients: ['client:view', 'client:create', 'client:edit', 'client:delete'],
  Orders: ['order:view', 'order:create', 'order:edit', 'order:approve'],
  Payments: ['payment:view', 'payment:create'],
  Analytics: ['analytics:view', 'report:export'],
  Settings: ['settings:view', 'settings:edit'],
  Accounting: ['accounting:view', 'accounting:create', 'accounting:edit'],
  Suppliers: ['supplier:view', 'supplier:create', 'supplier:edit', 'supplier:delete'],
  'Purchase Orders': ['purchase_order:view', 'purchase_order:create', 'purchase_order:edit'],
  Inventory: ['inventory:view', 'inventory:adjust'],
  Currency: ['currency:view', 'currency:edit'],
  Administration: ['user:manage', 'role:manage', 'audit:view'],
};

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
