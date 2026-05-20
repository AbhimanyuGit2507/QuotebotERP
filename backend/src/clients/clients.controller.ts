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
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateClientDto } from './dtos/create-client.dto';
import { UpdateClientDto } from './dtos/update-client.dto';
import { UpdateClientTierDto } from './dtos/update-client-tier.dto';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.CLIENT_VIEW)
  @ApiOperation({ summary: 'List all clients with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of clients' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name or email',
  })
  @ApiQuery({
    name: 'tier',
    required: false,
    description: 'Filter by tier: new, regular, top',
  })
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
    @Query('search') search?: string,
    @Query('tier') tier?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const allowedTiers = ['new', 'regular', 'top'];

    if (tier && !allowedTiers.includes(tier)) {
      throw new BadRequestException('Invalid tier filter');
    }

    return this.clientsService.findAll(user.tenant_id, {
      search,
      tier,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });
  }

  @Get('export/csv')
  @RequirePermission(PERMISSIONS.CLIENT_VIEW)
  @ApiOperation({ summary: 'Export clients as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search: string | undefined,
    @Query('tier') tier: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.clientsService.exportCsv(user.tenant_id, {
      search,
      tier,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="clients-export.csv"',
    );

    return res.send(csv);
  }

  @Get(':id/transactions')
  @RequirePermission(PERMISSIONS.CLIENT_VIEW)
  @ApiOperation({ summary: 'Get transaction history for a client' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Client transaction history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  transactions(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientsService.transactions(id, user.tenant_id);
  }

  @Put(':id/tier')
  @RequirePermission(PERMISSIONS.CLIENT_EDIT)
  @ApiOperation({ summary: 'Update client tier' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Client tier updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  updateTier(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateClientTierDto,
  ) {
    return this.clientsService.updateTier(id, user.tenant_id, body.tier);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.CLIENT_VIEW)
  @ApiOperation({ summary: 'Get a single client by ID' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Client details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clientsService.findOne(id, user.tenant_id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.CLIENT_CREATE)
  @ApiOperation({ summary: 'Create a new client' })
  @ApiResponse({ status: 201, description: 'Client created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateClientDto,
  ) {
    return this.clientsService.create(user.tenant_id, body);
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.CLIENT_EDIT)
  @ApiOperation({ summary: 'Update an existing client' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Client updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateClientDto,
  ) {
    return this.clientsService.update(id, user.tenant_id, body);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.CLIENT_DELETE)
  @ApiOperation({ summary: 'Delete a client (soft or force)' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiQuery({
    name: 'forceDelete',
    required: false,
    description: 'Permanently delete (admin only)',
  })
  @ApiResponse({ status: 200, description: 'Client deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  remove(
    @Param('id') id: string,
    @Query('forceDelete') forceDelete: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (forceDelete === 'true') {
      if (user.role !== 'admin') {
        throw new ForbiddenException(
          'Only admin users can permanently delete records',
        );
      }
      return this.clientsService.forceDelete(id, user.tenant_id);
    }
    return this.clientsService.remove(id, user.tenant_id);
  }
}
