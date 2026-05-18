import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const Decimal = Prisma.Decimal;
import {
  PaginationParams,
  PaginatedResult,
  parsePaginationParams,
} from '../common/utils/pagination.util';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getStockMovements(
    tenantId: string,
    params: PaginationParams & {
      productId?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<PaginatedResult<any>> {
    const { skip, take, page, pageSize } = parsePaginationParams(params);

    const where: any = {
      tenant_id: tenantId,
      ...(params.productId ? { product_id: params.productId } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.startDate || params.endDate
        ? {
            created_at: {
              ...(params.startDate ? { gte: new Date(params.startDate) } : {}),
              ...(params.endDate ? { lte: new Date(params.endDate) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { product: { select: { id: true, name: true, sku: true } } },
        skip,
        take,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async recordMovement(
    tenantId: string,
    dto: {
      product_id: string;
      type: string;
      quantity: number;
      reference_type?: string;
      reference_id?: string;
      notes?: string;
    },
    userId?: string,
  ) {
    const validTypes = ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'];
    if (!validTypes.includes(dto.type)) {
      throw new BadRequestException('Invalid movement type');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.product_id, tenant_id: tenantId, deleted_at: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    const movement = await this.prisma.stockMovement.create({
      data: {
        tenant_id: tenantId,
        product_id: dto.product_id,
        type: dto.type,
        quantity: new Decimal(dto.quantity),
        reference_type: dto.reference_type,
        reference_id: dto.reference_id,
        notes: dto.notes,
        created_by: userId,
      },
    });

    // Update product stock
    let newStock: number;
    if (dto.type === 'IN') {
      newStock = product.stock + Math.abs(dto.quantity);
    } else if (dto.type === 'OUT') {
      newStock = Math.max(0, product.stock - Math.abs(dto.quantity));
    } else if (dto.type === 'ADJUSTMENT') {
      newStock = Math.max(0, dto.quantity);
    } else {
      // TRANSFER — treat as OUT
      newStock = Math.max(0, product.stock - Math.abs(dto.quantity));
    }

    await this.prisma.product.update({
      where: { id: dto.product_id },
      data: { stock: newStock },
    });

    return movement;
  }

  async getStockAlerts(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        reorder_level: { gt: 0 },
      },
      orderBy: { stock: 'asc' },
    });

    // Return only products where stock <= reorder_level
    return products.filter((p) => p.stock <= p.reorder_level);
  }

  async getStockValuation(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        cost: true,
        unit: true,
      },
    });

    const items = products.map((p) => {
      const totalValue = new Decimal(p.stock).mul(p.cost);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        cost: p.cost,
        unit: p.unit,
        total_value: totalValue,
      };
    });

    const grandTotal = items.reduce(
      (sum, i) => sum.add(i.total_value),
      new Decimal(0),
    );

    return { items, grand_total: grandTotal };
  }

  async recordGRN(
    tenantId: string,
    purchaseOrderId: string,
    grnItems: Array<{
      product_id?: string;
      product_name: string;
      quantity_received: number;
      quantity_accepted: number;
      quantity_rejected?: number;
      notes?: string;
    }>,
    userId?: string,
  ) {
    const po = await this.prisma.purchaseOrderOutbound.findFirst({
      where: { id: purchaseOrderId, tenant_id: tenantId, deleted_at: null },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');

    // Generate GRN number
    const count = await this.prisma.goodsReceiptNote.count({
      where: { tenant_id: tenantId },
    });
    const grnNumber = `GRN-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(3, '0')}`;

    const grn = await this.prisma.goodsReceiptNote.create({
      data: {
        tenant_id: tenantId,
        purchase_order_id: purchaseOrderId,
        number: grnNumber,
        received_by: userId,
        items: {
          create: grnItems.map((item) => ({
            product_id: item.product_id || null,
            product_name: item.product_name,
            quantity_received: new Decimal(item.quantity_received),
            quantity_accepted: new Decimal(item.quantity_accepted),
            quantity_rejected: new Decimal(item.quantity_rejected || 0),
            notes: item.notes,
          })),
        },
      },
      include: { items: true },
    });

    // Update PO item received quantities and create stock movements
    for (const grnItem of grnItems) {
      if (grnItem.product_id) {
        // Find matching PO item
        const poItem = po.items.find(
          (i) => i.product_id === grnItem.product_id,
        );
        if (poItem) {
          const newReceived = new Decimal(poItem.received_quantity).add(
            new Decimal(grnItem.quantity_accepted),
          );
          await this.prisma.purchaseOrderOutboundItem.update({
            where: { id: poItem.id },
            data: { received_quantity: newReceived },
          });
        }

        // Create IN stock movement for accepted quantity
        if (grnItem.quantity_accepted > 0) {
          await this.recordMovement(
            tenantId,
            {
              product_id: grnItem.product_id,
              type: 'IN',
              quantity: grnItem.quantity_accepted,
              reference_type: 'PO_RECEIPT',
              reference_id: grn.id,
              notes: `GRN ${grnNumber} from PO ${po.number}`,
            },
            userId,
          );
        }
      }
    }

    // Check if all PO items are fully received
    const updatedPo = await this.prisma.purchaseOrderOutbound.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    });

    if (updatedPo) {
      const allReceived = updatedPo.items.every((item) =>
        new Decimal(item.received_quantity).gte(item.quantity),
      );
      const someReceived = updatedPo.items.some((item) =>
        new Decimal(item.received_quantity).gt(0),
      );

      if (allReceived) {
        await this.prisma.purchaseOrderOutbound.update({
          where: { id: purchaseOrderId },
          data: { status: 'received' },
        });
      } else if (someReceived) {
        await this.prisma.purchaseOrderOutbound.update({
          where: { id: purchaseOrderId },
          data: { status: 'partially_received' },
        });
      }
    }

    return grn;
  }
}
