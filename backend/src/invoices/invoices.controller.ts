import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Body,
  Req,
  UseGuards,
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
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { BadRequestException } from '@nestjs/common';

type AuthRequest = Request & { user?: { tenant_id?: string } };

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @RequirePermission(PERMISSIONS.INVOICE_CREATE)
  @ApiOperation({ summary: 'Create a new invoice from a quotation' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(
    @Req() req: AuthRequest,
    @Body() body: { quotation_id: string; due_date?: string; date?: string },
  ) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.invoicesService.create(tenantId, body);
  }

  @Get()
  @RequirePermission(PERMISSIONS.INVOICE_VIEW)
  @ApiOperation({ summary: 'List all invoices with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of invoices' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order: asc or desc' })
  async list(
    @Req() req: AuthRequest,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.invoicesService.list(tenantId, {
      status,
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.INVOICE_VIEW)
  @ApiOperation({ summary: 'Get a single invoice by ID' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async get(@Req() req: AuthRequest, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.invoicesService.get(tenantId, id);
  }

  @Get(':id/quotation')
  @RequirePermission(PERMISSIONS.INVOICE_VIEW)
  @ApiOperation({ summary: 'Get the related quotation for an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Related quotation details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getQuotation(@Req() req: AuthRequest, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.invoicesService.getRelatedQuotation(tenantId, id);
  }

  @Get(':id/purchase-orders')
  @RequirePermission(PERMISSIONS.INVOICE_VIEW)
  @ApiOperation({ summary: 'Get related purchase orders for an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Related purchase orders' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getPurchaseOrders(@Req() req: AuthRequest, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.invoicesService.getRelatedPurchaseOrders(tenantId, id);
  }

  @Post(':id/payments')
  @RequirePermission(PERMISSIONS.INVOICE_CREATE)
  @ApiOperation({ summary: 'Record a payment against an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async recordPayment(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: { amount: number; method?: string; external_id?: string },
  ) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.invoicesService.recordPayment(tenantId, id, body);
  }
}

export default InvoicesController;
