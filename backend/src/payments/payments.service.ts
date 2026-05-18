import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  PaginationParams,
  PaginatedResult,
  parsePaginationParams,
} from '../common/utils/pagination.util';
import { RecordPaymentDto } from './dtos/record-payment.dto';

/** Allowed sortable columns for payments list */
const PAYMENT_SORTABLE_FIELDS = new Set([
  'created_at',
  'amount',
  'payment_method',
  'status',
  'updated_at',
]);

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordPayment(tenantId: string, dto: RecordPaymentDto) {
    // All reads and writes happen inside the transaction to prevent race conditions
    return this.prisma.$transaction(async (tx) => {
      // Validate invoice exists and belongs to tenant
      const invoice = await tx.invoice.findFirst({
        where: { id: dto.invoice_id, tenant_id: tenantId, deleted_at: null },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');

      // Validate payment amount doesn't exceed remaining balance
      const currentPaid = Number(invoice.paid_amount || 0);
      const total = Number(invoice.total || 0);
      const remaining = total - currentPaid;

      if (dto.amount > remaining) {
        throw new BadRequestException(
          `Payment amount (${dto.amount}) exceeds remaining balance (${Math.round(remaining * 100) / 100})`,
        );
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          tenant_id: tenantId,
          invoice_id: dto.invoice_id,
          amount: dto.amount,
          payment_method: dto.payment_method,
          reference_number: dto.reference_number,
          notes: dto.notes,
        },
      });

      // Calculate new paid amount and payment status
      const newPaidAmount = currentPaid + dto.amount;

      let paymentStatus: string;
      let invoiceStatus: string;
      if (newPaidAmount >= total) {
        paymentStatus = 'paid';
        invoiceStatus = 'paid';
      } else if (newPaidAmount > 0) {
        paymentStatus = 'partial';
        invoiceStatus = 'partial';
      } else {
        paymentStatus = 'unpaid';
        invoiceStatus = 'open';
      }

      // Update invoice — both payment_status and status for consistency
      await tx.invoice.update({
        where: { id: dto.invoice_id },
        data: {
          paid_amount: newPaidAmount,
          payment_status: paymentStatus,
          status: invoiceStatus,
        },
      });

      return payment;
    });
  }

  async findByInvoice(tenantId: string, invoiceId: string) {
    // Validate invoice exists and belongs to tenant
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenant_id: tenantId, deleted_at: null },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.prisma.payment.findMany({
      where: {
        tenant_id: tenantId,
        invoice_id: invoiceId,
        deleted_at: null,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findAll(
    tenantId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<any>> {
    const { skip, take, page, pageSize } = parsePaginationParams(params);

    // Validate sortBy against allowed fields
    const sortBy =
      params.sortBy && PAYMENT_SORTABLE_FIELDS.has(params.sortBy)
        ? params.sortBy
        : 'created_at';

    const where: any = {
      tenant_id: tenantId,
      deleted_at: null,
    };

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { invoice: true },
        orderBy: { [sortBy]: params.sortOrder || 'desc' },
        skip,
        take,
      }),
      this.prisma.payment.count({ where }),
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

  async getReceivablesAging(tenantId: string) {
    // Query all unpaid/partial invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenant_id: tenantId,
        payment_status: { not: 'paid' },
        deleted_at: null,
      },
    });

    const now = new Date();
    const aging = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_90_plus: 0,
      total: 0,
    };

    for (const invoice of invoices) {
      const amountDue = Number(invoice.total || 0) - Number(invoice.paid_amount || 0);
      const referenceDate = invoice.due_date || invoice.date;
      const diffMs = now.getTime() - new Date(referenceDate).getTime();
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) {
        aging.current += amountDue;
      } else if (daysOverdue <= 30) {
        aging.days_1_30 += amountDue;
      } else if (daysOverdue <= 60) {
        aging.days_31_60 += amountDue;
      } else if (daysOverdue <= 90) {
        aging.days_61_90 += amountDue;
      } else {
        aging.days_90_plus += amountDue;
      }

      aging.total += amountDue;
    }

    // Round all values to 2 decimal places
    aging.current = Math.round(aging.current * 100) / 100;
    aging.days_1_30 = Math.round(aging.days_1_30 * 100) / 100;
    aging.days_31_60 = Math.round(aging.days_31_60 * 100) / 100;
    aging.days_61_90 = Math.round(aging.days_61_90 * 100) / 100;
    aging.days_90_plus = Math.round(aging.days_90_plus * 100) / 100;
    aging.total = Math.round(aging.total * 100) / 100;

    return aging;
  }
}
