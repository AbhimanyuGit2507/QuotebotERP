import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  PaginationParams,
  PaginatedResult,
  parsePaginationParams,
} from '../common/utils/pagination.util';

/** Allowed sortable columns for invoices list */
const INVOICE_SORTABLE_FIELDS = new Set([
  'created_at',
  'number',
  'date',
  'due_date',
  'total',
  'status',
  'payment_status',
  'paid_amount',
  'updated_at',
]);

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    return `INV/${year}-${ts}${rand}`;
  }

  async create(
    tenantId: string,
    payload: { quotation_id: string; due_date?: string; date?: string },
  ) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: payload.quotation_id, tenant_id: tenantId },
      include: { client: true, items: true },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found for invoice creation');
    }

    const existingInvoice = await this.prisma.invoice.findFirst({
      where: {
        tenant_id: tenantId,
        quotation_id: quotation.id,
        deleted_at: null,
      },
      include: { payments: true, quotation: true },
    });

    if (existingInvoice) {
      return existingInvoice;
    }

    const companySettings = await this.prisma.settingsCompany.findUnique({
      where: { tenant_id: tenantId },
    });

    const invoice = await this.prisma.invoice.create({
      data: {
        tenant_id: tenantId,
        quotation_id: quotation.id,
        number: this.generateInvoiceNumber(),
        date: payload.date ? new Date(payload.date) : new Date(),
        due_date: payload.due_date ? new Date(payload.due_date) : undefined,
        currency: companySettings?.currency ?? 'INR',
        subtotal: Number(quotation.subtotal) || 0,
        tax: Number(quotation.tax) || 0,
        total: Number(quotation.total) || 0,
        status: 'open',
      },
      include: { payments: true, quotation: true },
    });

    // compute display_name and search_tokens from linked quotation
    try {
      const clientName = quotation.client?.name || '';
      const itemNames = (quotation.items || []).map(
        (it) => it.product_name || '',
      );
      const displayDate = invoice.date || new Date();
      const dd = String(displayDate.getDate()).padStart(2, '0');
      const mm = String(displayDate.getMonth() + 1).padStart(2, '0');
      const yy = String(displayDate.getFullYear()).slice(-2);
      const dateShort = `${dd}/${mm}/${yy}`;
      const clientShort = clientName
        .split(/\s+/)
        .slice(0, 3)
        .join(' ')
        .slice(0, 30);
      const display = `INV - ${dateShort} - ${clientShort}${itemNames.length ? ' - ' + itemNames.slice(0, 5).join(', ') : ''}`;
      const tokens = [dateShort, clientShort, ...itemNames.slice(0, 5)];
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          display_name: display,
          search_tokens: tokens as unknown as Prisma.InputJsonValue,
        },
      });
    } catch {
      // best effort
    }

    return invoice;
  }

  async list(
    tenantId: string,
    params: PaginationParams & { status?: string },
  ): Promise<PaginatedResult<any>> {
    const { skip, take, page, pageSize } = parsePaginationParams(params);
    const { search, status } = params;

    const where: any = {
      tenant_id: tenantId,
      deleted_at: null,
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: 'insensitive' } },
              { display_name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { payments: true, quotation: true },
        orderBy: {
          [params.sortBy && INVOICE_SORTABLE_FIELDS.has(params.sortBy)
            ? params.sortBy
            : 'created_at']: params.sortOrder || 'desc',
        },
        skip,
        take,
      }),
      this.prisma.invoice.count({ where }),
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

  async get(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
      include: { payments: true, quotation: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async recordPayment(
    tenantId: string,
    invoiceId: string,
    payload: {
      amount: number;
      method?: string;
      external_id?: string;
      processed_at?: string;
    },
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenant_id: tenantId, deleted_at: null },
      include: {
        quotation: {
          select: { conversation_id: true },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payment = await this.prisma.payment.create({
      data: {
        tenant_id: tenantId,
        invoice_id: invoiceId,
        amount: Number(payload.amount),
        method: payload.method,
        external_id: payload.external_id,
        processed_at: payload.processed_at
          ? new Date(payload.processed_at)
          : undefined,
      },
    });

    const paid = Number(invoice.paid_amount || 0) + Number(payment.amount || 0);
    const total = Number(invoice.total || 0);
    let status: string;
    let paymentStatus: string;
    if (paid >= total) {
      status = 'paid';
      paymentStatus = 'paid';
    } else if (paid > 0) {
      status = 'partial';
      paymentStatus = 'partial';
    } else {
      status = 'open';
      paymentStatus = 'unpaid';
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { paid_amount: paid, status, payment_status: paymentStatus },
    });

    // Update conversation stage to PAID if full payment received
    if (status === 'paid' && invoice.quotation?.conversation_id) {
      await this.prisma.conversation.update({
        where: { id: invoice.quotation.conversation_id },
        data: {
          current_stage: 'PAID',
          updated_at: new Date(),
        },
      });
    }

    return payment;
  }

  async getRelatedQuotation(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenant_id: tenantId },
      include: {
        quotation: {
          include: {
            client: true,
            items: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice.quotation;
  }

  async getRelatedPurchaseOrders(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenant_id: tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.prisma.assistancePurchaseOrder.findMany({
      where: {
        invoice_id: invoiceId,
        tenant_id: tenantId,
      },
      include: {
        conversation: {
          select: {
            id: true,
            customer_name: true,
          },
        },
        quotation: {
          select: {
            id: true,
            number: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}

export default InvoicesService;
