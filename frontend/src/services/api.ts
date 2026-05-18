const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL?.trim() || '/api';

export const AUTH_TOKEN_KEY = 'quotebot_access_token';

export interface ApiRequestOptions extends RequestInit {
  token?: string | null;
}

export interface DownloadOptions {
  path: string;
  fileName: string;
  token?: string | null;
}

export interface RetryInboxMessagePayload {
  force_retry?: boolean;
  reason?: string;
}

export interface RfqFromEmailItemPayload {
  product_id?: string;
  product_name?: string;
  name?: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

export interface RfqPreviewFromEmailPayload {
  client_email: string;
  message_id?: string;
  items: RfqFromEmailItemPayload[];
}

export interface RfqPreviewFromEmailResponse {
  message_id: string;
  client_email: string;
  matched_items: RfqFromEmailItemPayload[];
  unmatched_items: Array<{
    input_name: string;
    quantity: number;
    reason:
      | 'invalid_quantity'
      | 'invalid_product_name'
      | 'conversation_text_rejected'
      | 'product_not_found'
      | 'product_inactive'
      | 'out_of_stock'
      | 'insufficient_stock';
  }>;
  summary: string;
}

export interface CreateRfqFromEmailPayload extends RfqPreviewFromEmailPayload {
  parsing_source?: string;
  parsing_confidence?: string;
}

export interface CreateRfqFromEmailResponse {
  id?: string;
  number?: string;
  quotation_id?: string;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const token = options.token ?? getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('X-Requested-With', 'XMLHttpRequest');

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorPayload = await response.json();
      message =
        errorPayload?.message ||
        errorPayload?.error ||
        errorPayload?.errors?.message ||
        message;
    } catch {
      // Ignore non-JSON error responses.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function downloadFromApi({
  path,
  fileName,
  token,
}: DownloadOptions) {
  const resolvedToken = token ?? null;
  const headers = new Headers();

  if (resolvedToken) {
    headers.set('Authorization', `Bearer ${resolvedToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function retryInboxMessage(messageId: string, payload: RetryInboxMessagePayload = {}) {
  return apiRequest(`/inbox/messages/${messageId}/retry`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function retryInboxMessageByRfq(rfqId: string, payload: RetryInboxMessagePayload = {}) {
  return apiRequest(`/inbox/rfqs/${rfqId}/retry`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function previewRfqFromEmail(payload: RfqPreviewFromEmailPayload) {
  return apiRequest<RfqPreviewFromEmailResponse>('/rfqs/preview-from-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createRfqFromEmail(payload: CreateRfqFromEmailPayload) {
  return apiRequest<CreateRfqFromEmailResponse>('/rfqs/from-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface SendEmailPayload {
  email_account_id?: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
}

export function sendEmail(payload: SendEmailPayload) {
  return apiRequest('/email/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Zoho import/preview endpoints
export function previewZohoCustomers() {
  return apiRequest<{ ok: boolean; rows: Array<any> }>('/integrations/zoho/preview/customers', {
    method: 'POST',
  });
}

export function importZohoCustomers(overrides?: Array<{ externalId: string; localEntity: string; localId: string }>) {
  return apiRequest('/integrations/zoho/import/customers', { method: 'POST', body: JSON.stringify({ overrides: overrides || [] }) });
}

export function previewZohoItems() {
  return apiRequest<{ ok: boolean; rows: Array<any> }>('/integrations/zoho/preview/items', {
    method: 'POST',
  });
}

export function importZohoItems(overrides?: Array<{ externalId: string; localEntity: string; localId: string }>) {
  return apiRequest('/integrations/zoho/import/items', { method: 'POST', body: JSON.stringify({ overrides: overrides || [] }) });
}