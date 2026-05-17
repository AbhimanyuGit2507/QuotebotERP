import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

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
      where: { tenant_id: tenantId, quotation_id: quotation.id },
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
        date: payload.date || new Date().toISOString().split('T')[0],
        due_date: payload.due_date || undefined,
        currency: companySettings?.currency ?? 'INR',
        subtotal: quotation.subtotal ?? 0,
        tax: quotation.tax ?? 0,
        total: quotation.total ?? 0,
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
      const dd = String(new Date().getDate()).padStart(2, '0');
      const mm = String(new Date().getMonth() + 1).padStart(2, '0');
      const yy = String(new Date().getFullYear()).slice(-2);
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

  async list(tenantId: string, status?: string) {
    return this.prisma.invoice.findMany({
      where: { tenant_id: tenantId, ...(status ? { status } : {}) },
      include: { payments: true, quotation: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async get(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenant_id: tenantId },
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
      where: { id: invoiceId, tenant_id: tenantId },
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
    const status = paid >= Number(invoice.total || 0) ? 'paid' : 'partial';

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { paid_amount: paid, status },
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
