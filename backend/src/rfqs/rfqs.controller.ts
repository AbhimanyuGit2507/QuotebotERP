import {
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
import { RfqsService } from './rfqs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { RfqsQueryDto } from './dtos/rfqs-query.dto';
import { CreateRfqDto } from './dtos/create-rfq.dto';
import { UpdateRfqDto } from './dtos/update-rfq.dto';
import { UpdateRfqStatusDto } from './dtos/update-rfq-status.dto';
import { CreateRfqFromEmailDto } from './dtos/create-rfq-from-email.dto';
import { SendRfqEmailDto } from './dtos/send-rfq-email.dto';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('RFQs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('rfqs')
export class RfqsController {
  constructor(private readonly rfqsService: RfqsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.RFQ_VIEW)
  @ApiOperation({ summary: 'List all RFQs with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of RFQs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order: asc or desc' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RfqsQueryDto,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.rfqsService.findAll(user.tenant_id, {
      search: query.search,
      status: query.status,
      channel: query.channel,
      limit: query.limit,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });
  }

  @Get('export/csv')
  @RequirePermission(PERMISSIONS.RFQ_VIEW)
  @ApiOperation({ summary: 'Export RFQs as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RfqsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.rfqsService.exportCsv(user.tenant_id, {
      search: query.search,
      status: query.status,
      channel: query.channel,
      limit: query.limit,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="rfqs-export.csv"',
    );

    return res.send(csv);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.RFQ_VIEW)
  @ApiOperation({ summary: 'Get a single RFQ by ID' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({ status: 200, description: 'RFQ details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.rfqsService.findOne(id, user.tenant_id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.RFQ_CREATE)
  @ApiOperation({ summary: 'Create a new RFQ' })
  @ApiResponse({ status: 201, description: 'RFQ created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateRfqDto) {
    return this.rfqsService.create(user.tenant_id, body);
  }

  @Post('from-email')
  @RequirePermission(PERMISSIONS.RFQ_CREATE)
  @ApiOperation({ summary: 'Create an RFQ from an email' })
  @ApiResponse({ status: 201, description: 'RFQ created from email successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  createFromEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRfqFromEmailDto,
  ) {
    return this.rfqsService.createFromEmail(user.tenant_id, body);
  }

  @Post('preview-from-email')
  @RequirePermission(PERMISSIONS.RFQ_VIEW)
  @ApiOperation({ summary: 'Preview RFQ data extracted from an email' })
  @ApiResponse({ status: 200, description: 'Extracted RFQ preview data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  previewFromEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRfqFromEmailDto,
  ): Promise<unknown> {
    return this.rfqsService.previewFromEmail(user.tenant_id, body);
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.RFQ_EDIT)
  @ApiOperation({ summary: 'Update an existing RFQ' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({ status: 200, description: 'RFQ updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateRfqDto,
  ) {
    return this.rfqsService.update(id, user.tenant_id, body);
  }

  @Put(':id/status')
  @RequirePermission(PERMISSIONS.RFQ_EDIT)
  @ApiOperation({ summary: 'Update RFQ status' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({ status: 200, description: 'RFQ status updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateRfqStatusDto,
  ) {
    return this.rfqsService.updateStatus(id, user.tenant_id, body.status);
  }

  @Post(':id/convert-to-quotation')
  @RequirePermission(PERMISSIONS.RFQ_EDIT)
  @ApiOperation({ summary: 'Convert an RFQ to a quotation' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({ status: 201, description: 'Quotation created from RFQ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  convertToQuotation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rfqsService.convertToQuotation(id, user.tenant_id);
  }

  @Post(':id/send-email')
  @RequirePermission(PERMISSIONS.RFQ_EDIT)
  @ApiOperation({ summary: 'Send RFQ via email' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({ status: 200, description: 'RFQ email sent successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  sendByEmail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SendRfqEmailDto,
  ) {
    return this.rfqsService.sendByEmail(id, user.tenant_id, body);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.RFQ_DELETE)
  @ApiOperation({ summary: 'Delete an RFQ (soft or force)' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiQuery({ name: 'forceDeleteLinkedQuotation', required: false, description: 'Also delete linked quotation' })
  @ApiQuery({ name: 'forceDelete', required: false, description: 'Permanently delete (admin only)' })
  @ApiResponse({ status: 200, description: 'RFQ deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('forceDeleteLinkedQuotation') force?: string,
    @Query('forceDelete') forceDelete?: string,
  ) {
    const forceFlag = Boolean(force === 'true' || force === '1');
    if (forceDelete === 'true') {
      if (user.role !== 'admin') {
        throw new ForbiddenException(
          'Only admin users can permanently delete records',
        );
      }
      return this.rfqsService.forceDelete(id, user.tenant_id, {
        forceDeleteLinkedQuotation: forceFlag,
      });
    }
    return this.rfqsService.remove(id, user.tenant_id, {
      forceDeleteLinkedQuotation: forceFlag,
    });
  }
}
