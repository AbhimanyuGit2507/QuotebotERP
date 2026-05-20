export interface NormalisedWhatsAppMessage {
  /** WhatsAppAccount id from DB */
  accountId: string;
  tenantId: string;
  /** Provider-level message ID for dedup */
  externalId?: string;
  fromNumber: string;
  toNumber?: string;
  /** Plain text body */
  body: string;
  mediaUrl?: string;
  mediaType?: string;
  direction: 'inbound' | 'outbound';
  /** ISO 8601 timestamp */
  timestamp: string;
  rawPayload?: unknown;
}
