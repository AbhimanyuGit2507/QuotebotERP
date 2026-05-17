import {
  IsString,
  IsEmail,
  IsOptional,
  IsObject,
  IsDateString,
} from 'class-validator';

/**
 * Inbound Email DTO
 * Single unified entry point for all email providers (Gmail, SES, SMTP, forwards)
 * Internal scripts push to POST /api/internal/email/inbound
 */
export class InboundEmailDto {
  /**
   * Email account ID that received this email
   * QueryParam: which account in the system this came through
   */
  @IsString()
  email_account_id!: string;

  /**
   * Provider-specific message ID (Gmail: messageId, SES: bounce ID, etc)
   * Used for deduplication: @@unique([email_account_id, external_id])
   */
  @IsString()
  external_id!: string;

  /**
   * Email thread ID (Gmail: threadId)
   * Used to group conversations
   */
  @IsOptional()
  @IsString()
  thread_id?: string;

  /**
   * Provider identifier
   * Tells backend what system this came from
   */
  @IsString()
  provider!: 'gmail' | 'ses' | 'smtp' | 'forward';

  /**
   * Sender email address
   * Used to auto-find or create Client
   */
  @IsEmail()
  sender_email!: string;

  /**
   * Sender display name
   * Display in UI
   */
  @IsString()
  @IsOptional()
  sender_name?: string;

  /**
   * Subject line
   */
  @IsString()
  subject!: string;

  /**
   * Message body (plaintext or HTML)
   */
  @IsString()
  body!: string;

  /**
   * Full provider payload (headers, metadata, etc)
   * Stored for future processing (RFQ parsing, ML, etc)
   */
  @IsOptional()
  @IsObject()
  raw_payload?: Record<string, any>;

  /**
   * When email was received
   * ISO 8601 datetime
   */
  @IsOptional()
  @IsDateString()
  received_at?: string;
}
