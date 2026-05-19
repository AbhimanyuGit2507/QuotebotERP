import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PERMISSIONS } from '../common/constants/permissions';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PURCHASE_ORDER_VIEW)
  @ApiOperation({ summary: 'List all purchase orders' })
  @ApiResponse({ status: 200, description: 'Paginated list of purchase orders' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.purchaseOrdersService.findAll(user.tenant_id, {
      search,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PURCHASE_ORDER_VIEW)
  @ApiOperation({ summary: 'Get a purchase order by ID' })
  @ApiResponse({ status: 200, description: 'Purchase order details' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseOrdersService.findOne(id, user.tenant_id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PURCHASE_ORDER_CREATE)
  @ApiOperation({ summary: 'Create a new purchase order' })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(user.tenant_id, dto, user.id);
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.PURCHASE_ORDER_EDIT)
  @ApiOperation({ summary: 'Update a purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order updated' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.update(id, user.tenant_id, dto);
  }

  @Patch(':id/status')
  @RequirePermission(PERMISSIONS.PURCHASE_ORDER_EDIT)
  @ApiOperation({ summary: 'Update purchase order status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { status: string },
  ) {
    return this.purchaseOrdersService.updateStatus(
      id,
      user.tenant_id,
      body.status,
      user.id,
    );
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.PURCHASE_ORDER_EDIT)
  @ApiOperation({ summary: 'Delete a purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order deleted' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseOrdersService.softDelete(id, user.tenant_id);
  }
}
