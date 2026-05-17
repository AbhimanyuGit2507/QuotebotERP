import {
  BadRequestException,
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
}
