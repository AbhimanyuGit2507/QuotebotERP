import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { PurchaseOrderStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(@Req() req: any, @Query('status') status?: string) {
    const tenantId = req.user?.tenant_id;
    const validStatus = status as PurchaseOrderStatus | undefined;
    return this.ordersService.findAll(tenantId, validStatus);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    return this.ordersService.findOne(tenantId, id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: PurchaseOrderStatus },
  ) {
    const tenantId = req.user?.tenant_id;
    return this.ordersService.updateStatus(tenantId, id, body.status);
  }

  @Post(':id/generate-invoice')
  async generateInvoice(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    return this.ordersService.generateInvoice(tenantId, id);
  }

  @Post(':id/mark-invoice-sent')
  async markInvoiceSent(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    return this.ordersService.markInvoiceSent(tenantId, id);
  }

  @Post(':id/confirm-payment')
  async confirmPayment(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      amount: number;
      method?: string;
      external_id?: string;
    },
  ) {
    const tenantId = req.user?.tenant_id;
    return this.ordersService.confirmPayment(tenantId, id, body);
  }

  @Post(':id/mark-completed')
  async markCompleted(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    return this.ordersService.markCompleted(tenantId, id);
  }

  @Post(':id/cancel')
  async cancel(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const tenantId = req.user?.tenant_id;
    return this.ordersService.cancel(tenantId, id, body.reason);
  }
}
