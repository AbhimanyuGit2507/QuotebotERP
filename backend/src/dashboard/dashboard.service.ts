import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(tenantId: string) {
    const [
      rfqs,
      quotations,
      acceptedQuotes,
      declinedQuotes,
      products,
      clients,
      openInvoices,
      paidInvoices,
    ] = await Promise.all([
      this.prisma.rFQ.count({ where: { tenant_id: tenantId } }),
      this.prisma.quotation.count({ where: { tenant_id: tenantId } }),
      this.prisma.quotation.count({
        where: { tenant_id: tenantId, status: 'accepted' },
      }),
      this.prisma.quotation.count({
        where: { tenant_id: tenantId, status: 'declined' },
      }),
      this.prisma.product.count({
        where: { tenant_id: tenantId, status: 'active' },
      }),
      this.prisma.client.count({ where: { tenant_id: tenantId } }),
      this.prisma.invoice.count({
        where: { tenant_id: tenantId, status: 'open' },
      }),
      this.prisma.invoice.count({
        where: { tenant_id: tenantId, status: 'paid' },
      }),
    ]);

    return {
      totalRfqs: rfqs,
      quotesSent: quotations,
      acceptedQuotes,
      declinedQuotes,
      activeProducts: products,
      clients,
      openInvoices,
      paidInvoices,
    };
  }

  async getRfqVsQuotes(tenantId: string) {
    const [rfqs, quotes] = await Promise.all([
      this.prisma.rFQ.findMany({
        where: { tenant_id: tenantId },
        select: { created_at: true },
      }),
      this.prisma.quotation.findMany({
        where: { tenant_id: tenantId },
        select: { created_at: true },
      }),
    ]);

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date.toISOString().split('T')[0];
    });

    return days.map((day) => ({
      date: day,
      rfqs: rfqs.filter((item) => item.created_at.toISOString().startsWith(day))
        .length,
      quotes: quotes.filter((item) =>
        item.created_at.toISOString().startsWith(day),
      ).length,
    }));
  }

  async getQuoteStatus(tenantId: string) {
    const quotations = await this.prisma.quotation.findMany({
      where: { tenant_id: tenantId },
      select: { status: true },
    });

    const counts = quotations.reduce<Record<string, number>>(
      (acc, quotation) => {
        acc[quotation.status] = (acc[quotation.status] ?? 0) + 1;
        return acc;
      },
      {},
    );

    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }

  async getRfqByChannel(tenantId: string) {
    const rfqs = await this.prisma.rFQ.findMany({
      where: { tenant_id: tenantId },
      select: { channel: true },
    });

    const counts = rfqs.reduce<Record<string, number>>((acc, rfq) => {
      acc[rfq.channel] = (acc[rfq.channel] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([channel, count]) => ({
      channel,
      count,
    }));
  }

  async getActivityFeed(tenantId: string) {
    return this.prisma.activity.findMany({
      where: { tenant_id: tenantId },
      include: { user: true },
      orderBy: { created_at: 'desc' },
      take: 10,
    });
  }

  async getSystemStatus(tenantId: string) {
    const [pendingRfqs, draftQuotes, files] = await Promise.all([
      this.prisma.rFQ.count({
        where: { tenant_id: tenantId, status: 'pending' },
      }),
      this.prisma.quotation.count({
        where: { tenant_id: tenantId, status: 'draft' },
      }),
      this.prisma.file.count({ where: { tenant_id: tenantId } }),
    ]);

    return {
      database: 'connected',
      pendingRfqs,
      draftQuotes,
      files,
      auth: 'active',
    };
  }
}
