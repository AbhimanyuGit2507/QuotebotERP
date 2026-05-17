import {
  Controller,
  Post,
  Param,
  Req,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AccountingIntegrationsService } from './accounting-integrations.service';
import { BadRequestException } from '@nestjs/common';

type AuthRequest = Request & {
  user?: { id?: string; tenant_id?: string };
};

@Controller('integrations/accounting')
export class AccountingIntegrationsController {
  constructor(
    private readonly integrationsService: AccountingIntegrationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('status')
  status(@Req() req: AuthRequest) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.integrationsService.getStatus(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('xero/authorize')
  authorizeXero(@Req() req: AuthRequest) {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    if (!tenantId || !userId)
      throw new BadRequestException('Missing user context');
    return this.integrationsService.getXeroAuthorizeUrl(tenantId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('quickbooks/authorize')
  authorizeQuickBooks(@Req() req: AuthRequest) {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    if (!tenantId || !userId)
      throw new BadRequestException('Missing user context');
    return this.integrationsService.getQuickBooksAuthorizeUrl(tenantId, userId);
  }

  @Get('xero/callback')
  xeroCallback(@Query('code') code: string, @Query('state') state?: string) {
    return this.integrationsService.handleXeroCallback(code, state);
  }

  @Get('quickbooks/callback')
  quickbooksCallback(
    @Query('code') code: string,
    @Query('state') state?: string,
    @Query('realmId') realmId?: string,
  ) {
    return this.integrationsService.handleQuickBooksCallback(
      code,
      state,
      realmId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('xero/invoices/:id/export')
  exportInvoiceToXero(@Req() req: AuthRequest, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.integrationsService.exportInvoiceToXero(tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('quickbooks/invoices/:id/export')
  exportInvoiceToQuickBooks(@Req() req: AuthRequest, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.integrationsService.exportInvoiceToQuickBooks(tenantId, id);
  }
}

export default AccountingIntegrationsController;
