import { IsString, IsOptional, IsInt } from 'class-validator';

/**
 * Outbound Email Status Update DTO
 * Internal scripts call PATCH /api/internal/email/outbound/:id with this payload
 * After sending via Gmail/SES, report success/failure back to backend
 */
export class OutboundEmailUpdateDto {
  /**
   * Final status after send attempt
   */
  @IsString()
  status!: 'sent' | 'failed';

  /**
   * Which provider actually sent it
   * (useful if backend has fallback logic later)
   */
  @IsOptional()
  @IsString()
  provider?: string;

  /**
   * If failed, why
   */
  @IsOptional()
  @IsString()
  last_error?: string;

  /**
   * Increment attempt counter (tracked for retries)
   */
  @IsOptional()
  @IsInt()
  attempts?: number;
}
