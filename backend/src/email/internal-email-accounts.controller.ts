import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { InternalKeyAuthGuard } from '../common/guards/internal-key-auth.guard';
import { EmailService } from './email.service';

@Controller('internal')
@UseGuards(InternalKeyAuthGuard)
export class InternalEmailAccountsController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * GET /api/internal/email-accounts
   * Returns active accounts with provider token metadata for automation scripts.
   */
  @Get('email-accounts')
  async getEmailAccounts(@Req() req: Request) {
    const tenantId = req['tenantId'] as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found in request');
    }

    return this.emailService.getActiveEmailAccounts(tenantId);
  }

  /**
   * POST /api/internal/email-accounts/:id/refresh
   * Refreshes provider access token and persists it.
   */
  @Post('email-accounts/:id/refresh')
  async refreshEmailAccount(@Req() req: Request, @Param('id') id: string) {
    const tenantId = req['tenantId'] as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found in request');
    }

    return this.emailService.refreshEmailAccountAccessToken(id, tenantId);
  }

  /**
   * POST /api/internal/email-accounts/sync
   * Starts a catch-up sync for webhook relays or backend recovery jobs.
   */
  @Post('email-accounts/sync')
  triggerSync(@Req() req: Request) {
    const tenantId = req['tenantId'] as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found in request');
    }

    return this.emailService.triggerImmediateGmailSync(tenantId, {
      syncMode: 'webhook',
    });
  }

  /**
   * POST /api/internal/email-accounts/:id/sync-complete
   * Records the latest successful sync cursor for an email account.
   */
  @Post('email-accounts/:id/sync-complete')
  async markSyncComplete(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { synced_at?: string },
  ) {
    const tenantId = req['tenantId'] as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found in request');
    }

    const syncedAt =
      typeof body?.synced_at === 'string' && body.synced_at.trim()
        ? new Date(body.synced_at)
        : new Date();

    if (Number.isNaN(syncedAt.getTime())) {
      throw new BadRequestException('Invalid synced_at value');
    }

    return this.emailService.markEmailAccountSynced(id, tenantId, syncedAt);
  }
}
