import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('movements')
  @RequirePermission(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'List stock movements' })
  @ApiResponse({ status: 200, description: 'Paginated stock movements' })
  getMovements(
    @CurrentUser() user: AuthenticatedUser,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.inventoryService.getStockMovements(user.tenant_id, {
      productId,
      type,
      startDate,
      endDate,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post('movements')
  @RequirePermission(PERMISSIONS.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Record a stock movement' })
  @ApiResponse({ status: 201, description: 'Stock movement recorded' })
  recordMovement(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      product_id: string;
      type: string;
      quantity: number;
      reference_type?: string;
      reference_id?: string;
      notes?: string;
    },
  ) {
    return this.inventoryService.recordMovement(user.tenant_id, body, user.id);
  }

  @Get('alerts')
  @RequirePermission(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get stock alerts (low stock products)' })
  @ApiResponse({ status: 200, description: 'Low stock alerts' })
  getAlerts(@CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.getStockAlerts(user.tenant_id);
  }

  @Get('valuation')
  @RequirePermission(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get stock valuation report' })
  @ApiResponse({ status: 200, description: 'Stock valuation data' })
  getValuation(@CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.getStockValuation(user.tenant_id);
  }

  @Post('grn')
  @RequirePermission(PERMISSIONS.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Record a Goods Receipt Note' })
  @ApiResponse({ status: 201, description: 'GRN recorded' })
  recordGRN(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      purchase_order_id: string;
      items: Array<{
        product_id?: string;
        product_name: string;
        quantity_received: number;
        quantity_accepted: number;
        quantity_rejected?: number;
        notes?: string;
      }>;
    },
  ) {
    return this.inventoryService.recordGRN(
      user.tenant_id,
      body.purchase_order_id,
      body.items,
      user.id,
    );
  }
}
