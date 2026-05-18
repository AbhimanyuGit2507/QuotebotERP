import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { recordsToCsv } from '../common/utils/export.util';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async salesTrends(tenantId: string) {
    const quotations = await this.prisma.quotation.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      select: { date: true, total: true, status: true },
      orderBy: { created_at: 'asc' },
    });

    return quotations.map((quotation) => ({
      date: quotation.date,
      total: quotation.total,
      status: quotation.status,
    }));
  }

  async rfqAnalysis(tenantId: string) {
    const rfqs = await this.prisma.rFQ.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      include: { client: true, items: true },
    });

    return {
      total: rfqs.length,
      byStatus: rfqs.reduce<Record<string, number>>((acc, rfq) => {
        acc[rfq.status] = (acc[rfq.status] ?? 0) + 1;
        return acc;
      }, {}),
      byChannel: rfqs.reduce<Record<string, number>>((acc, rfq) => {
        acc[rfq.channel] = (acc[rfq.channel] ?? 0) + 1;
        return acc;
      }, {}),
      avgConfidence:
        rfqs.reduce((sum, rfq) => sum + rfq.confidence_score, 0) /
        (rfqs.length || 1),
    };
  }

  async quotePerformance(tenantId: string) {
    const quotations = await this.prisma.quotation.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
    });

    const accepted = quotations.filter(
      (quotation) => quotation.status === 'accepted',
    ).length;

    return {
      totalQuotes: quotations.length,
      acceptedQuotes: accepted,
      acceptanceRate: quotations.length
        ? (accepted / quotations.length) * 100
        : 0,
      totalValue: quotations.reduce(
        (sum, quotation) => sum + Number(quotation.total),
        0,
      ),
      averageValue:
        quotations.reduce((sum, quotation) => sum + Number(quotation.total), 0) /
        (quotations.length || 1),
    };
  }

  async productPerformance(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      include: { quotation_items: true, category: true },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category.name,
      quoteCount: product.quotation_items.length,
      stock: product.stock,
      price: product.price,
    }));
  }

  async clientInsights(tenantId: string) {
    return this.prisma.client.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      orderBy: [{ total_value: 'desc' }, { total_orders: 'desc' }],
    });
  }

  async channelBreakdown(tenantId: string) {
    const rfqs = await this.prisma.rFQ.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      select: { channel: true },
    });

    return rfqs.reduce<Record<string, number>>((acc, rfq) => {
      acc[rfq.channel] = (acc[rfq.channel] ?? 0) + 1;
      return acc;
    }, {});
  }

  async exportCsv(tenantId: string, report: string) {
    switch (report) {
      case 'sales-trends':
        return recordsToCsv(await this.salesTrends(tenantId));
      case 'rfq-analysis': {
        const analysis = await this.rfqAnalysis(tenantId);
        return recordsToCsv([
          {
            total: analysis.total,
            avgConfidence: analysis.avgConfidence,
            byStatus: JSON.stringify(analysis.byStatus),
            byChannel: JSON.stringify(analysis.byChannel),
          },
        ]);
      }
      case 'quote-performance':
        return recordsToCsv([await this.quotePerformance(tenantId)]);
      case 'product-performance':
        return recordsToCsv(await this.productPerformance(tenantId));
      case 'client-insights':
        return recordsToCsv(await this.clientInsights(tenantId));
      case 'channel-breakdown': {
        const breakdown = await this.channelBreakdown(tenantId);
        return recordsToCsv(
          Object.entries(breakdown).map(([channel, count]) => ({
            channel,
            count,
          })),
        );
      }
      default:
        return recordsToCsv([]);
    }
  }
}
