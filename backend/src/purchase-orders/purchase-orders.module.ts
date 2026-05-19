import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService, PrismaService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
