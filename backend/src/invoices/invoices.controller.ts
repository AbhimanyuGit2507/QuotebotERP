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
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';

type AuthRequest = Request & { user?: { tenant_id?: string } };

@ApiTags('Invoices')
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  async create(
    @Req() req: AuthRequest,
    @Body() body: { quotation_id: string; due_date?: string; date?: string },
  ) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.invoicesService.create(tenantId, body);
  }

  @Get()
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
  async get(@Req() req: AuthRequest, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.invoicesService.get(tenantId, id);
  }

  @Get(':id/quotation')
  async getQuotation(@Req() req: AuthRequest, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.invoicesService.getRelatedQuotation(tenantId, id);
  }

  @Get(':id/purchase-orders')
  async getPurchaseOrders(@Req() req: AuthRequest, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    return this.invoicesService.getRelatedPurchaseOrders(tenantId, id);
  }

  @Post(':id/payments')
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
