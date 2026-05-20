import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
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
import type { Response } from 'express';
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { QuotationsQueryDto } from './dtos/quotations-query.dto';
import { CreateQuotationDto } from './dtos/create-quotation.dto';
import { UpdateQuotationDto } from './dtos/update-quotation.dto';
import { SendQuotationEmailDto } from './dtos/send-quotation-email.dto';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('Quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @ApiOperation({
    summary: 'List all quotations with filtering and pagination',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of quotations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Items per page',
  })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order: asc or desc',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QuotationsQueryDto,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.quotationsService.findAll(user.tenant_id, {
      search: query.search,
      status: query.status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });
  }

  @Get('export/csv')
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @ApiOperation({ summary: 'Export quotations as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QuotationsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.quotationsService.exportCsv(user.tenant_id, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="quotations-export.csv"',
    );
    return res.send(csv);
  }

  @Get(':id/pdf')
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @ApiOperation({ summary: 'Download quotation as PDF' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  @ApiResponse({ status: 200, description: 'PDF file download' })
  async printable(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const pdf = await this.quotationsService.generatePdfBuffer(
      id,
      user.tenant_id,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="quotation-${id}.pdf"`,
    );
    return res.send(pdf);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @ApiOperation({ summary: 'Get a single quotation by ID' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  @ApiResponse({ status: 200, description: 'Quotation details' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quotationsService.findOne(id, user.tenant_id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.QUOTATION_CREATE)
  @ApiOperation({ summary: 'Create a new quotation' })
  @ApiResponse({ status: 201, description: 'Quotation created successfully' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateQuotationDto,
  ) {
    return this.quotationsService.create(user.tenant_id, body);
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.QUOTATION_EDIT)
  @ApiOperation({ summary: 'Update an existing quotation' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  @ApiResponse({ status: 200, description: 'Quotation updated successfully' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateQuotationDto,
  ) {
    return this.quotationsService.update(id, user.tenant_id, body);
  }

  @Put(':id/status')
  @RequirePermission(PERMISSIONS.QUOTATION_EDIT)
  @ApiOperation({ summary: 'Update quotation status' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('status') status: string,
  ) {
    const allowedStatuses = ['draft', 'sent', 'accepted', 'declined'];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid quotation status');
    }
    return this.quotationsService.updateStatus(id, user.tenant_id, status);
  }

  @Post(':id/duplicate')
  @RequirePermission(PERMISSIONS.QUOTATION_CREATE)
  @ApiOperation({ summary: 'Duplicate a quotation' })
  @ApiParam({ name: 'id', description: 'Quotation ID to duplicate' })
  duplicate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quotationsService.duplicate(id, user.tenant_id);
  }

  @Post(':id/send')
  @RequirePermission(PERMISSIONS.QUOTATION_SEND)
  @ApiOperation({ summary: 'Send quotation via email' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  sendByEmail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SendQuotationEmailDto,
  ) {
    return this.quotationsService.sendByEmail(id, user.tenant_id, body);
  }

  @Get(':id/purchase-orders')
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @ApiOperation({ summary: 'Get related purchase orders for a quotation' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  getPurchaseOrders(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quotationsService.getRelatedPurchaseOrders(id, user.tenant_id);
  }

  @Get(':id/invoices')
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @ApiOperation({ summary: 'Get related invoices for a quotation' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  getInvoices(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quotationsService.getRelatedInvoices(id, user.tenant_id);
  }

  @Post(':id/approve')
  @RequirePermission(PERMISSIONS.QUOTATION_APPROVE)
  @ApiOperation({ summary: 'Approve a quotation' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quotationsService.approve(id, user.tenant_id, user.id);
  }

  @Post(':id/reject')
  @RequirePermission(PERMISSIONS.QUOTATION_APPROVE)
  @ApiOperation({ summary: 'Reject a quotation' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quotationsService.reject(id, user.tenant_id, user.id, reason);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.QUOTATION_DELETE)
  @ApiOperation({ summary: 'Delete a quotation (soft or force)' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  @ApiQuery({
    name: 'forceDeleteLinkedRfq',
    required: false,
    description: 'Also delete linked RFQ',
  })
  @ApiQuery({
    name: 'forceDelete',
    required: false,
    description: 'Permanently delete (admin only)',
  })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('forceDeleteLinkedRfq') force?: string,
    @Query('forceDelete') forceDelete?: string,
  ) {
    const forceFlag = Boolean(force === 'true' || force === '1');
    if (forceDelete === 'true') {
      if (user.role !== 'admin') {
        throw new ForbiddenException(
          'Only admin users can permanently delete records',
        );
      }
      return this.quotationsService.forceDelete(id, user.tenant_id, {
        forceDeleteLinkedRfq: forceFlag,
      });
    }
    return this.quotationsService.remove(id, user.tenant_id, {
      forceDeleteLinkedRfq: forceFlag,
    });
  }
}
