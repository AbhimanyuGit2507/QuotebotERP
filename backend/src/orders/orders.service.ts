import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PurchaseOrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, status?: PurchaseOrderStatus) {
    return this.prisma.assistancePurchaseOrder.findMany({
      where: {
        tenant_id: tenantId,
        ...(status && { status }),
      },
      include: {
        conversation: {
          include: {
            client: true,
          },
        },
        quotation: {
          include: {
            items: true,
          },
        },
        invoice: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(tenantId: string, orderId: string) {
    const order = await this.prisma.assistancePurchaseOrder.findFirst({
      where: {
        id: orderId,
        tenant_id: tenantId,
      },
      include: {
        conversation: {
          include: {
            client: true,
            messages: {
              orderBy: {
                created_at: 'desc',
              },
              take: 10,
            },
          },
        },
        quotation: {
          include: {
            items: true,
          },
        },
        invoice: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(
    tenantId: string,
    orderId: string,
    status: PurchaseOrderStatus,
  ) {
    const order = await this.prisma.assistancePurchaseOrder.findFirst({
      where: {
        id: orderId,
        tenant_id: tenantId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.assistancePurchaseOrder.update({
      where: { id: orderId },
      data: {
        status,
        updated_at: new Date(),
      },
    });
  }

  async generateInvoice(tenantId: string, orderId: string) {
    const order = await this.findOne(tenantId, orderId);

    if (!order.quotation) {
      throw new NotFoundException(
        'No quotation linked to this order. Cannot generate invoice.',
      );
    }

    if (order.invoice_id) {
      throw new Error('Invoice already generated for this order');
    }

    // Generate invoice number
    const invoiceCount = await this.prisma.invoice.count({
      where: { tenant_id: tenantId },
    });
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`;

    // Create invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        tenant_id: tenantId,
        quotation_id: order.quotation_id,
        number: invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        currency: 'INR',
        subtotal: order.quotation.subtotal,
        tax: order.quotation.tax || 0,
        total: order.quotation.total,
        status: 'open',
      },
    });

    // Update order with invoice_id and status
    await this.prisma.assistancePurchaseOrder.update({
      where: { id: orderId },
      data: {
        invoice_id: invoice.id,
        status: PurchaseOrderStatus.INVOICE_GENERATED,
        updated_at: new Date(),
      },
    });

    return invoice;
  }

  async markInvoiceSent(tenantId: string, orderId: string) {
    const order = await this.findOne(tenantId, orderId);

    if (!order.invoice_id) {
      throw new Error('No invoice generated for this order');
    }

    return this.prisma.assistancePurchaseOrder.update({
      where: { id: orderId },
      data: {
        status: PurchaseOrderStatus.INVOICE_SENT,
        updated_at: new Date(),
      },
    });
  }

  async confirmPayment(
    tenantId: string,
    orderId: string,
    paymentDetails: {
      amount: number;
      method?: string;
      external_id?: string;
    },
  ) {
    const order = await this.findOne(tenantId, orderId);

    if (!order.invoice_id) {
      throw new Error('No invoice for this order');
    }

    // Record payment on invoice
    const payment = await this.prisma.payment.create({
      data: {
        tenant_id: tenantId,
        invoice_id: order.invoice_id,
        amount: Number(paymentDetails.amount),
        method: paymentDetails.method,
        external_id: paymentDetails.external_id,
        processed_at: new Date(),
      },
    });

    // Update invoice status
    const invoice = order.invoice;
    if (!invoice) {
      throw new Error('Invoice not found for this order');
    }

    const paid = Number(invoice.paid_amount || 0) + Number(payment.amount);
    const invoiceStatus = paid >= Number(invoice.total) ? 'paid' : 'partial';

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paid_amount: paid,
        status: invoiceStatus,
      },
    });

    // Update order status
    const orderStatus =
      invoiceStatus === 'paid'
        ? PurchaseOrderStatus.PAID
        : PurchaseOrderStatus.PAYMENT_PENDING;

    await this.prisma.assistancePurchaseOrder.update({
      where: { id: orderId },
      data: {
        status: orderStatus,
        updated_at: new Date(),
      },
    });

    // Update conversation stage if fully paid
    if (invoiceStatus === 'paid' && order.conversation_id) {
      await this.prisma.conversation.update({
        where: { id: order.conversation_id },
        data: {
          current_stage: 'PAID',
          updated_at: new Date(),
        },
      });
    }

    return payment;
  }

  async markCompleted(tenantId: string, orderId: string) {
    const order = await this.findOne(tenantId, orderId);

    if (order.status !== PurchaseOrderStatus.PAID) {
      throw new Error('Order must be paid before marking as completed');
    }

    return this.prisma.assistancePurchaseOrder.update({
      where: { id: orderId },
      data: {
        status: PurchaseOrderStatus.COMPLETED,
        updated_at: new Date(),
      },
    });
  }

  async cancel(tenantId: string, orderId: string, reason?: string) {
    return this.prisma.assistancePurchaseOrder.update({
      where: { id: orderId },
      data: {
        status: PurchaseOrderStatus.CANCELLED,
        updated_at: new Date(),
      },
    });
  }
}
