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
        quotations.reduce(
          (sum, quotation) => sum + Number(quotation.total),
          0,
        ) / (quotations.length || 1),
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

  // =============================================
  // Enhanced Analytics Methods
  // =============================================

  async getConversionFunnel(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;
    const hasDateFilter = startDate || endDate;

    // Stage 1: RFQs created in date range
    const rfqCount = await this.prisma.rFQ.count({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        ...(hasDateFilter ? { created_at: dateFilter } : {}),
      },
    });

    // Stage 2: Quotations linked from those RFQs
    const quotationCount = await this.prisma.quotation.count({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        rfq: { isNot: null },
        ...(hasDateFilter ? { created_at: dateFilter } : {}),
      },
    });

    // Stage 3: Accepted quotations
    const acceptedCount = await this.prisma.quotation.count({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        status: 'accepted',
        ...(hasDateFilter ? { created_at: dateFilter } : {}),
      },
    });

    // Stage 4: Invoices from accepted quotations
    const invoicedCount = await this.prisma.invoice.count({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        quotation_id: { not: null },
        ...(hasDateFilter ? { created_at: dateFilter } : {}),
      },
    });

    // Stage 5: Completed payments
    const paidCount = await this.prisma.payment.count({
      where: {
        tenant_id: tenantId,
        status: 'completed',
        invoice: {
          deleted_at: null,
          quotation_id: { not: null },
        },
        ...(hasDateFilter ? { created_at: dateFilter } : {}),
      },
    });

    const stages = [
      { name: 'RFQs', count: rfqCount, rate: 100 },
      {
        name: 'Quotations',
        count: quotationCount,
        rate: rfqCount > 0 ? (quotationCount / rfqCount) * 100 : 0,
      },
      {
        name: 'Accepted',
        count: acceptedCount,
        rate:
          quotationCount > 0
            ? (acceptedCount / quotationCount) * 100
            : 0,
      },
      {
        name: 'Invoiced',
        count: invoicedCount,
        rate:
          acceptedCount > 0 ? (invoicedCount / acceptedCount) * 100 : 0,
      },
      {
        name: 'Paid',
        count: paidCount,
        rate:
          invoicedCount > 0 ? (paidCount / invoicedCount) * 100 : 0,
      },
    ];

    return { stages };
  }

  async getRevenueForecasting(tenantId: string) {
    // Pipeline value: sum of quotation.total where status='sent'
    const sentQuotations = await this.prisma.quotation.findMany({
      where: {
        tenant_id: tenantId,
        status: 'sent',
        deleted_at: null,
      },
      select: { total: true },
    });
    const pipelineValue = sentQuotations.reduce(
      (sum, q) => sum + Number(q.total),
      0,
    );

    // Historical conversion rate (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recentQuotations = await this.prisma.quotation.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        created_at: { gte: ninetyDaysAgo },
      },
      select: { status: true },
    });

    const totalRecent = recentQuotations.length;
    const acceptedRecent = recentQuotations.filter(
      (q) => q.status === 'accepted',
    ).length;
    const conversionRate =
      totalRecent > 0 ? (acceptedRecent / totalRecent) * 100 : 0;

    // Projected revenue
    const projectedRevenue = pipelineValue * (conversionRate / 100);

    // Monthly trend: last 6 months actual invoice totals
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        created_at: { gte: sixMonthsAgo },
      },
      select: { total: true, created_at: true },
    });

    const monthlyTrend: {
      month: string;
      actual?: number;
      projected?: number;
    }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthInvoices = invoices.filter((inv) => {
        const invDate = new Date(inv.created_at);
        return (
          invDate.getFullYear() === d.getFullYear() &&
          invDate.getMonth() === d.getMonth()
        );
      });
      const actual = monthInvoices.reduce(
        (sum, inv) => sum + Number(inv.total),
        0,
      );
      monthlyTrend.push({ month: monthKey, actual });
    }

    // Compute average of last 3 months for projection
    const lastThreeActual = monthlyTrend
      .slice(-3)
      .reduce((sum, m) => sum + (m.actual || 0), 0);
    const avgMonthly = lastThreeActual / 3;
    const projectionBase = avgMonthly * (conversionRate / 100 || 1);

    // Next 3 months projected
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend.push({
        month: monthKey,
        projected: Math.round(
          projectionBase > 0 ? projectionBase : avgMonthly,
        ),
      });
    }

    return {
      pipelineValue: Math.round(pipelineValue),
      conversionRate: Math.round(conversionRate * 100) / 100,
      projectedRevenue: Math.round(projectedRevenue),
      monthlyTrend,
    };
  }

  async getClientInsightsEnhanced(tenantId: string, limit = 10) {
    const clients = await this.prisma.client.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      include: {
        quotations: {
          where: { deleted_at: null },
          select: {
            id: true,
            status: true,
            sent_at: true,
            total: true,
            created_at: true,
            invoices: {
              where: {
                deleted_at: null,
                payment_status: { not: 'cancelled' },
              },
              select: { total: true, created_at: true },
            },
            purchase_orders: {
              select: { created_at: true },
            },
          },
        },
      },
    });

    const now = new Date();
    const thisQuarterStart = new Date(
      now.getFullYear(),
      Math.floor(now.getMonth() / 3) * 3,
      1,
    );
    const lastQuarterStart = new Date(thisQuarterStart);
    lastQuarterStart.setMonth(lastQuarterStart.getMonth() - 3);

    const enriched = clients.map((client) => {
      const allInvoiceTotals = client.quotations.flatMap((q) =>
        q.invoices.map((inv) => ({
          total: Number(inv.total),
          date: inv.created_at,
        })),
      );
      const revenue = allInvoiceTotals.reduce((s, i) => s + i.total, 0);

      const totalQuotes = client.quotations.length;
      const acceptedQuotes = client.quotations.filter(
        (q) => q.status === 'accepted',
      ).length;
      const acceptanceRate =
        totalQuotes > 0
          ? Math.round((acceptedQuotes / totalQuotes) * 100 * 100) / 100
          : 0;

      const responseDays: number[] = [];
      for (const q of client.quotations) {
        if (q.sent_at && q.purchase_orders.length > 0) {
          const sentDate = new Date(q.sent_at).getTime();
          const poDate = new Date(
            q.purchase_orders[0].created_at,
          ).getTime();
          const days = Math.round(
            (poDate - sentDate) / (1000 * 60 * 60 * 24),
          );
          if (days >= 0) responseDays.push(days);
        }
      }
      const avgResponseDays =
        responseDays.length > 0
          ? Math.round(
              (responseDays.reduce((s, d) => s + d, 0) /
                responseDays.length) *
                100,
            ) / 100
          : null;

      const thisQRevenue = allInvoiceTotals
        .filter((i) => i.date >= thisQuarterStart)
        .reduce((s, i) => s + i.total, 0);
      const lastQRevenue = allInvoiceTotals
        .filter(
          (i) =>
            i.date >= lastQuarterStart && i.date < thisQuarterStart,
        )
        .reduce((s, i) => s + i.total, 0);
      const growth =
        lastQRevenue > 0
          ? Math.round(
              ((thisQRevenue - lastQRevenue) / lastQRevenue) * 100 * 100,
            ) / 100
          : thisQRevenue > 0
            ? 100
            : 0;

      return {
        id: client.id,
        name: client.name,
        revenue: Math.round(revenue),
        acceptanceRate,
        avgResponseDays,
        growth,
      };
    });

    enriched.sort((a, b) => b.revenue - a.revenue);

    return { topClients: enriched.slice(0, limit) };
  }

  async getProductPerformanceEnhanced(tenantId: string, limit = 10) {
    const products = await this.prisma.product.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      include: {
        quotation_items: {
          where: { deleted_at: null },
          include: {
            quotation: {
              select: { status: true, deleted_at: true },
            },
          },
        },
      },
    });

    const result = products.map((product) => {
      const allItems = product.quotation_items.filter(
        (qi) => qi.quotation.deleted_at === null,
      );
      const quoteCount = allItems.length;

      const acceptedItems = allItems.filter(
        (qi) => qi.quotation.status === 'accepted',
      );
      const revenue = acceptedItems.reduce(
        (sum, qi) => sum + Number(qi.total),
        0,
      );

      const price = Number(product.price);
      const cost = Number(product.cost);
      const marginPercent =
        price > 0
          ? Math.round(((price - cost) / price) * 100 * 100) / 100
          : 0;

      const totalUnitPrices = allItems.reduce(
        (sum, qi) => sum + Number(qi.unit_price),
        0,
      );
      const avgUnitPrice =
        allItems.length > 0
          ? Math.round((totalUnitPrices / allItems.length) * 100) / 100
          : Number(product.price);

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        quoteCount,
        revenue: Math.round(revenue),
        marginPercent,
        avgUnitPrice,
      };
    });

    result.sort((a, b) => b.quoteCount - a.quoteCount);

    return { products: result.slice(0, limit) };
  }

  async getAIPipelineMetrics(tenantId: string) {
    const totalParseRuns = await this.prisma.parseRun.count({
      where: { tenant_id: tenantId },
    });
    const completedParseRuns = await this.prisma.parseRun.count({
      where: { tenant_id: tenantId, status: 'success' },
    });
    const parseSuccessRate =
      totalParseRuns > 0
        ? Math.round(
            (completedParseRuns / totalParseRuns) * 100 * 100,
          ) / 100
        : 0;

    // Auto-quote rate: quotations created within 1 minute of RFQ creation
    const rfqsWithQuotations = await this.prisma.rFQ.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        quotation_id: { not: null },
      },
      select: {
        created_at: true,
        quotation: { select: { created_at: true } },
      },
    });

    const totalRfqs = await this.prisma.rFQ.count({
      where: { tenant_id: tenantId, deleted_at: null },
    });

    const autoQuoteCount = rfqsWithQuotations.filter((rfq) => {
      if (!rfq.quotation) return false;
      const rfqTime = new Date(rfq.created_at).getTime();
      const quoteTime = new Date(rfq.quotation.created_at).getTime();
      return Math.abs(quoteTime - rfqTime) < 60000;
    }).length;

    const autoQuoteRate =
      totalRfqs > 0
        ? Math.round((autoQuoteCount / totalRfqs) * 100 * 100) / 100
        : 0;

    // Average confidence
    const rfqsWithConfidence = await this.prisma.rFQ.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        confidence_score: { gt: 0 },
      },
      select: { confidence_score: true },
    });

    const avgConfidence =
      rfqsWithConfidence.length > 0
        ? Math.round(
            (rfqsWithConfidence.reduce(
              (sum, r) => sum + r.confidence_score,
              0,
            ) /
              rfqsWithConfidence.length) *
              100,
          ) / 100
        : 0;

    return {
      parseSuccessRate,
      autoQuoteRate,
      avgConfidence,
      totalParseRuns,
      totalRfqs,
    };
  }
}
