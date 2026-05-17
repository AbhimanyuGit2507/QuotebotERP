import {
  BadRequestException,
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { EmailService } from './email.service';
import { InboundEmailDto } from './dtos/inbound-email.dto';
import { OutboundEmailUpdateDto } from './dtos/outbound-email-update.dto';
import { InternalKeyAuthGuard } from '../common/guards/internal-key-auth.guard';

/**
 * Internal Email Controller
 * Used by n8n and external systems to exchange email data
 * All endpoints protected by X-Internal-Key header
 */
@Controller('internal/email')
@UseGuards(InternalKeyAuthGuard)
export class EmailController {
  constructor(private emailService: EmailService) {}

  /**
   * POST /api/internal/email/inbound
   *
   * n8n pushes inbound emails here
   * Called after fetching from Gmail, SES, or SMTP
   *
   * Request body: InboundEmailDto (provider, sender, subject, body, raw_payload)
   * Response: Created Message + Conversation + Client
   *
   * Side effects:
   * - Creates Conversation if new thread
   * - Auto-creates Client if sender email unknown
   * - Deduplicates via (email_account_id, external_id)
   * - Flags message as is_processed=false for RFQ parsing pipeline
   *
   * Idempotent: Safe to retry with same external_id
   */
  @Post('inbound')
  async inboundEmail(@Req() req: Request, @Body() dto: InboundEmailDto) {
    const tenantId = req['tenantId'] as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found in request');
    }

    const rawResult = await this.emailService.processInboundEmail(
      tenantId,
      dto,
    );
    const result = rawResult as {
      message: unknown;
      conversation: { id: string };
      client: { id: string };
      is_duplicate: boolean;
    };

    return {
      success: true,
      message: result.message,
      conversation_id: result.conversation.id,
      client_id: result.client.id,
      is_duplicate: result.is_duplicate || false,
    };
  }

  /**
   * GET /api/internal/email/outbound?status=pending
   *
   * n8n pulls pending outbound emails from here
   * Sends them via Gmail/SES, then reports status back via PATCH
   *
   * Query params:
   * - status: 'pending' | 'sent' | 'failed' (default: 'pending')
   * - limit: max items to return (default: 100)
   *
   * Response: Array of { id, email_account_id, provider, to, subject, body, attempts }
   */
  @Get('outbound')
  async getOutboundEmails(
    @Req() req: Request,
    @Query('status') status: string = 'pending',
    @Query('limit') limit: string = '100',
  ) {
    const tenantId = req['tenantId'] as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found in request');
    }

    if (status !== 'pending') {
      // For now only support pending; can extend later
      return [];
    }

    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 500)
      : 100;

    const emails = await this.emailService.getPendingOutboundEmails(
      tenantId,
      safeLimit,
    );

    return emails;
  }

  /**
   * PATCH /api/internal/email/outbound/:id
   *
   * n8n reports outcome of sending via Gmail/SES
   *
   * Request body: { status: 'sent' | 'failed', provider, last_error?, attempts? }
   * Response: Updated OutboundEmail record
   *
   * Side effects:
   * - Updates status (sent/failed)
   * - Increments attempts counter
   * - Records sent_at timestamp if successful
   */
  @Patch('outbound/:id')
  async updateOutboundEmailStatus(
    @Req() req: Request,
    @Param('id') emailId: string,
    @Body() dto: OutboundEmailUpdateDto,
  ) {
    const tenantId = req['tenantId'] as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found in request');
    }

    const updated = await this.emailService.updateOutboundEmailStatus(
      tenantId,
      emailId,
      dto,
    );

    return {
      success: true,
      data: updated,
    };
  }
}
