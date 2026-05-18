export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface Product {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  category_id: string;
  unit: string;
  price: number;
  cost: number;
  stock: number;
  reorder_level: number;
  hsn?: string;
  gst_percent: number;
  description?: string;
  status: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Client {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  gst?: string;
  pan?: string;
  tier: string;
  total_orders: number;
  total_value: number;
  last_order_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  tenant_id: string;
  number: string;
  client_id: string;
  display_name?: string;
  date: string;
  valid_until?: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  approval_status: string;
  terms_conditions?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  number: string;
  quotation_id?: string;
  date: string;
  due_date?: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  paid_amount: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

export interface RFQ {
  id: string;
  tenant_id: string;
  number: string;
  client_id: string;
  channel: string;
  priority: string;
  status: string;
  confidence_score: number;
  due_date?: string;
  display_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  amount: number;
  method?: string;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
  status: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_json?: string;
  after_json?: string;
  created_at: string;
}

export interface TaxProfile {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  rate: number;
  hsn_code?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
