import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const Decimal = Prisma.Decimal;
import {
  PaginationParams,
  PaginatedResult,
  parsePaginationParams,
} from '../common/utils/pagination.util';

// Valid PO status transitions (state machine)
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['confirmed', 'cancelled'],
  confirmed: ['partially_received', 'cancelled'],
  partially_received: ['received', 'cancelled'],
};

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const prefix = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.purchaseOrderOutbound.count({
      where: {
        tenant_id: tenantId,
        number: { startsWith: prefix },
      },
    });
    return `${prefix}-${String(count + 1).padStart(3, '0')}`;
  }

  async findAll(
    tenantId: string,
    params: PaginationParams & { status?: string },
  ): Promise<PaginatedResult<any>> {
    const { skip, take, page, pageSize } = parsePaginationParams(params);
    const { search, status } = params;

    const where: any = {
      tenant_id: tenantId,
      deleted_at: null,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: 'insensitive' } },
              { supplier: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrderOutbound.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { supplier: true, items: true },
        skip,
        take,
      }),
      this.prisma.purchaseOrderOutbound.count({ where }),
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

  async findOne(id: string, tenantId: string) {
    const po = await this.prisma.purchaseOrderOutbound.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
      include: {
        supplier: true,
        items: { include: { product: true } },
        grns: { include: { items: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async create(
    tenantId: string,
    body: {
      supplier_id: string;
      expected_delivery?: string;
      currency?: string;
      notes?: string;
      items: Array<{
        product_id?: string;
        product_name: string;
        quantity: number;
        unit_price: number;
        tax_percent?: number;
        unit?: string;
      }>;
    },
    userId?: string,
  ) {
    // Validate supplier belongs to same tenant
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: body.supplier_id, tenant_id: tenantId, deleted_at: null },
    });
    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const number = await this.generateNumberTx(tx, tenantId);

      const items = body.items.map((item) => {
        const qty = new Decimal(item.quantity);
        const price = new Decimal(item.unit_price);
        const taxPct = new Decimal(item.tax_percent || 0);
        const lineTotal = qty
          .mul(price)
          .mul(new Decimal(1).add(taxPct.div(100)));
        return {
          product_id: item.product_id || null,
          product_name: item.product_name,
          quantity: qty,
          unit_price: price,
          tax_percent: taxPct,
          total: lineTotal,
          unit: item.unit || 'pcs',
        };
      });

      const subtotal = items.reduce(
        (sum, i) => sum.add(new Decimal(i.quantity).mul(i.unit_price)),
        new Decimal(0),
      );
      const tax = items.reduce((sum, i) => {
        const lineTax = new Decimal(i.quantity)
          .mul(i.unit_price)
          .mul(i.tax_percent)
          .div(100);
        return sum.add(lineTax);
      }, new Decimal(0));
      const total = subtotal.add(tax);

      return tx.purchaseOrderOutbound.create({
        data: {
          tenant_id: tenantId,
          number,
          supplier_id: body.supplier_id,
          expected_delivery: body.expected_delivery
            ? new Date(body.expected_delivery)
            : null,
          currency: body.currency || 'INR',
          notes: body.notes,
          created_by: userId,
          subtotal,
          tax,
          total,
          items: { create: items },
        },
        include: { supplier: true, items: true },
      });
    });
  }

  private async generateNumberTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<string> {
    const now = new Date();
    const prefix = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await tx.purchaseOrderOutbound.count({
      where: {
        tenant_id: tenantId,
        number: { startsWith: prefix },
      },
    });
    return `${prefix}-${String(count + 1).padStart(3, '0')}`;
  }

  async update(
    id: string,
    tenantId: string,
    body: Partial<{
      supplier_id: string;
      expected_delivery: string;
      currency: string;
      notes: string;
    }>,
  ) {
    await this.findOne(id, tenantId);
    const data: any = { ...body };
    if (body.expected_delivery) {
      data.expected_delivery = new Date(body.expected_delivery);
    }
    return this.prisma.purchaseOrderOutbound.update({
      where: { id },
      data,
      include: { supplier: true, items: true },
    });
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: string,
    userId?: string,
  ) {
    const validStatuses = [
      'draft',
      'sent',
      'confirmed',
      'partially_received',
      'received',
      'cancelled',
    ];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const po = await this.findOne(id, tenantId);

    // Validate state machine transition
    const allowedNextStatuses = VALID_TRANSITIONS[po.status];
    if (!allowedNextStatuses || !allowedNextStatuses.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${po.status} to ${status}`,
      );
    }

    const data: any = { status };
    if (status === 'confirmed' && userId) {
      data.approved_by = userId;
      data.approved_at = new Date();
    }

    const updated = await this.prisma.purchaseOrderOutbound.update({
      where: { id },
      data,
      include: { supplier: true, items: true },
    });

    // Record activity when PO is sent
    if (status === 'sent') {
      await this.prisma.activity.create({
        data: {
          tenant_id: tenantId,
          entity_type: 'PurchaseOrder',
          entity_id: id,
          action: 'sent',
          user_id: userId,
        },
      });
    }

    return updated;
  }

  async softDelete(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.prisma.purchaseOrderOutbound.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return { message: 'Purchase order deleted successfully' };
  }
}
