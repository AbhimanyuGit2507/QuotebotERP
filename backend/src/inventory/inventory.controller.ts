import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('Inventory')
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('movements')
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
    return this.inventoryService.recordMovement(
      user.tenant_id,
      body,
      user.id,
    );
  }

  @Get('alerts')
  getAlerts(@CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.getStockAlerts(user.tenant_id);
  }

  @Get('valuation')
  getValuation(@CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.getStockValuation(user.tenant_id);
  }

  @Post('grn')
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
