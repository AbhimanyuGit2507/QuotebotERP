import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BillsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBillIfThreshold(params: {
    tenantId: string;
    messageId: string;
    fromEmail: string;
    subject: string;
    extract: Record<string, unknown>;
    confidence: number; // 0..1
  }) {
    const reviewThreshold = Number(
      process.env.EMAIL_CLASSIFIER_BILL_CONFIDENCE_REVIEW || 0.6,
    );
    const autoConfirmThreshold = Number(
      process.env.EMAIL_CLASSIFIER_BILL_CONFIDENCE_AUTO || 0.85,
    );

    if (Number(params.confidence || 0) < reviewThreshold) {
      return null;
    }

    const status =
      params.confidence >= autoConfirmThreshold
        ? 'CONFIRMED'
        : 'REVIEW_PENDING';

    const created = await this.prisma.bill.create({
      data: {
        tenant_id: params.tenantId,
        message_id: params.messageId,
        from_email: params.fromEmail,
        subject: params.subject,
        invoice_number: (params.extract.invoiceNumber as string) || undefined,
        amount: params.extract.amount
          ? Number(params.extract.amount)
          : undefined,
        currency: (params.extract.currency as string) || undefined,

        due_date: params.extract.dueDate
          ? new Date(params.extract.dueDate as string)
          : undefined,
        confidence: Number(params.confidence || 0),
        raw_extract: params.extract as any,
        status,
      },
    });

    return created;
  }

  async listBills(tenantId: string, limit = 50) {
    return this.prisma.bill.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async getBill(tenantId: string, id: string) {
    return this.prisma.bill.findFirst({ where: { tenant_id: tenantId, id } });
  }
}
