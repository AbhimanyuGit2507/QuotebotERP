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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dtos/create-account.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';
import { CreateJournalEntryDto } from './dtos/create-journal-entry.dto';

type AuthRequest = Request & { user?: { id?: string; tenant_id?: string } };

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
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
  @RequirePermission(PERMISSIONS.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get the chart of accounts (hierarchical)' })
  @ApiResponse({ status: 200, description: 'Hierarchical chart of accounts' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listAccounts(@Req() req: AuthRequest) {
    return this.accountingService.getChartOfAccounts(this.getTenantId(req));
  }

  @Get('chart-of-accounts/all')
  @RequirePermission(PERMISSIONS.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get all accounts (flat list)' })
  @ApiResponse({ status: 200, description: 'Flat list of all accounts' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listAllAccounts(@Req() req: AuthRequest) {
    return this.accountingService.getAllAccounts(this.getTenantId(req));
  }

  @Post('chart-of-accounts')
  @RequirePermission(PERMISSIONS.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a new account in the chart of accounts' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createAccount(
    @Req() req: AuthRequest,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountingService.createAccount(this.getTenantId(req), dto);
  }

  @Put('chart-of-accounts/:id')
  @RequirePermission(PERMISSIONS.ACCOUNTING_EDIT)
  @ApiOperation({ summary: 'Update an account in the chart of accounts' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Account updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateAccount(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountingService.updateAccount(this.getTenantId(req), id, dto);
  }

  @Delete('chart-of-accounts/:id')
  @RequirePermission(PERMISSIONS.ACCOUNTING_EDIT)
  @ApiOperation({ summary: 'Delete an account from the chart of accounts' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.accountingService.deleteAccount(this.getTenantId(req), id);
  }

  @Post('chart-of-accounts/seed')
  @RequirePermission(PERMISSIONS.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Seed default chart of accounts for the tenant' })
  @ApiResponse({ status: 201, description: 'Default accounts seeded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async seedAccounts(@Req() req: AuthRequest) {
    return this.accountingService.seedDefaultAccounts(this.getTenantId(req));
  }

  /* ─── Journal Entries ─── */

  @Get('journal-entries')
  @RequirePermission(PERMISSIONS.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List journal entries with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of journal entries' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter (ISO 8601)' })
  @ApiQuery({ name: 'accountId', required: false, description: 'Filter by account ID' })
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
  @RequirePermission(PERMISSIONS.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @RequirePermission(PERMISSIONS.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get trial balance report' })
  @ApiResponse({ status: 200, description: 'Trial balance data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'As-of date (ISO 8601)' })
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
  @RequirePermission(PERMISSIONS.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get profit and loss report' })
  @ApiResponse({ status: 200, description: 'Profit and loss data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Period start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Period end date (ISO 8601)' })
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
  @RequirePermission(PERMISSIONS.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get balance sheet report' })
  @ApiResponse({ status: 200, description: 'Balance sheet data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'As-of date (ISO 8601)' })
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
