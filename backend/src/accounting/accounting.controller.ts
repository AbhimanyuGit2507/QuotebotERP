import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dtos/create-account.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';
import { CreateJournalEntryDto } from './dtos/create-journal-entry.dto';

type AuthRequest = Request & { user?: { id?: string; tenant_id?: string } };

@ApiTags('Accounting')
@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  private getTenantId(req: AuthRequest): string {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return tenantId;
  }

  /* ─── Chart of Accounts ─── */

  @Get('chart-of-accounts')
  async listAccounts(@Req() req: AuthRequest) {
    return this.accountingService.getChartOfAccounts(this.getTenantId(req));
  }

  @Get('chart-of-accounts/all')
  async listAllAccounts(@Req() req: AuthRequest) {
    return this.accountingService.getAllAccounts(this.getTenantId(req));
  }

  @Post('chart-of-accounts')
  async createAccount(
    @Req() req: AuthRequest,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountingService.createAccount(this.getTenantId(req), dto);
  }

  @Put('chart-of-accounts/:id')
  async updateAccount(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountingService.updateAccount(this.getTenantId(req), id, dto);
  }

  @Delete('chart-of-accounts/:id')
  async deleteAccount(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.accountingService.deleteAccount(this.getTenantId(req), id);
  }

  @Post('chart-of-accounts/seed')
  async seedAccounts(@Req() req: AuthRequest) {
    return this.accountingService.seedDefaultAccounts(this.getTenantId(req));
  }

  /* ─── Journal Entries ─── */

  @Get('journal-entries')
  async listJournalEntries(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.accountingService.getJournalEntries(this.getTenantId(req), {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      startDate,
      endDate,
      accountId,
    });
  }

  @Post('journal-entries')
  async createJournalEntry(
    @Req() req: AuthRequest,
    @Body() dto: CreateJournalEntryDto,
  ) {
    return this.accountingService.createJournalEntry(
      this.getTenantId(req),
      dto,
      req.user?.id,
    );
  }

  /* ─── Reports ─── */

  @Get('trial-balance')
  async getTrialBalance(
    @Req() req: AuthRequest,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.accountingService.getTrialBalance(
      this.getTenantId(req),
      asOfDate,
    );
  }

  @Get('profit-and-loss')
  async getProfitAndLoss(
    @Req() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountingService.getProfitAndLoss(
      this.getTenantId(req),
      startDate,
      endDate,
    );
  }

  @Get('balance-sheet')
  async getBalanceSheet(
    @Req() req: AuthRequest,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.accountingService.getBalanceSheet(
      this.getTenantId(req),
      asOfDate,
    );
  }
}
