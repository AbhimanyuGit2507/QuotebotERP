import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPricingSuggestions(
    tenantId: string,
    productId: string,
    clientId?: string,
  ) {
    // Find last 20 QuotationItems for this product where quotation is accepted
    const items = await this.prisma.quotationItem.findMany({
      where: {
        product_id: productId,
        deleted_at: null,
        quotation: {
          tenant_id: tenantId,
          status: 'accepted',
          deleted_at: null,
        },
      },
      select: { unit_price: true },
      orderBy: { quotation: { created_at: 'desc' } },
      take: 20,
    });

    // Client-specific items
    let clientItems: { unit_price: any }[] = [];
    if (clientId) {
      clientItems = await this.prisma.quotationItem.findMany({
        where: {
          product_id: productId,
          deleted_at: null,
          quotation: {
            tenant_id: tenantId,
            client_id: clientId,
            status: 'accepted',
            deleted_at: null,
          },
        },
        select: { unit_price: true },
        orderBy: { quotation: { created_at: 'desc' } },
        take: 20,
      });
    }

    // Current product price
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenant_id: tenantId },
      select: { price: true },
    });

    const prices = items.map((i) => Number(i.unit_price)).sort((a, b) => a - b);
    const count = prices.length;

    if (count === 0) {
      return {
        suggestedPrice: product ? Number(product.price) : 0,
        confidence: 'low' as const,
        basedOn: 0,
        currentPrice: product ? Number(product.price) : 0,
        priceRange: { min: 0, max: 0 },
        clientSpecificCount: clientItems.length,
      };
    }

    // Compute median
    const median =
      count % 2 === 0
        ? (prices[count / 2 - 1] + prices[count / 2]) / 2
        : prices[Math.floor(count / 2)];

    const confidence =
      count >= 5 ? 'high' : count >= 2 ? 'medium' : ('low' as const);

    // If client-specific data exists, weight it
    let suggestedPrice = median;
    if (clientItems.length >= 2) {
      const clientPrices = clientItems.map((i) => Number(i.unit_price));
      const clientMedian =
        clientPrices.length % 2 === 0
          ? (clientPrices[clientPrices.length / 2 - 1] +
              clientPrices[clientPrices.length / 2]) /
            2
          : clientPrices[Math.floor(clientPrices.length / 2)];
      suggestedPrice = clientMedian * 0.6 + median * 0.4;
    }

    return {
      suggestedPrice: Math.round(suggestedPrice * 100) / 100,
      confidence,
      basedOn: count,
      currentPrice: product ? Number(product.price) : 0,
      priceRange: {
        min: prices[0],
        max: prices[prices.length - 1],
      },
      clientSpecificCount: clientItems.length,
    };
  }

  async getFollowUpRecommendations(tenantId: string) {
    const now = new Date();

    // Stale quotes: status='sent', sent_at older than 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const staleQuotations = await this.prisma.quotation.findMany({
      where: {
        tenant_id: tenantId,
        status: 'sent',
        deleted_at: null,
        sent_at: { lt: threeDaysAgo },
      },
      include: {
        client: { select: { name: true } },
      },
      orderBy: { sent_at: 'asc' },
    });

    const staleQuotes = staleQuotations.map((q) => {
      const sentDate = q.sent_at ? new Date(q.sent_at) : new Date(q.created_at);
      const daysSinceSent = Math.floor(
        (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        id: q.id,
        number: q.number,
        clientName: q.client.name,
        total: Number(q.total),
        daysSinceSent,
        sentAt: sentDate.toISOString(),
      };
    });

    // Overdue invoices
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        due_date: { lt: now },
        payment_status: { notIn: ['paid', 'cancelled'] },
      },
      include: {
        quotation: {
          select: {
            client: { select: { name: true } },
          },
        },
      },
      orderBy: { due_date: 'asc' },
    });

    const overdueInvoicesList = overdueInvoices.map((inv) => {
      const dueDate = inv.due_date ? new Date(inv.due_date) : new Date();
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        id: inv.id,
        number: inv.number,
        clientName: inv.quotation?.client?.name || 'Unknown',
        amountDue: Number(inv.total) - Number(inv.paid_amount),
        daysOverdue,
        dueDate: dueDate.toISOString(),
      };
    });

    // Inactive clients: last activity > 30 days, has at least 1 completed invoice
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allClients = await this.prisma.client.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      include: {
        quotations: {
          where: { deleted_at: null },
          select: { created_at: true, updated_at: true },
          orderBy: { updated_at: 'desc' },
          take: 1,
        },
        rfqs: {
          where: { deleted_at: null },
          select: { created_at: true },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    // Check which clients have at least 1 completed invoice via quotation
    const clientsWithInvoices = await this.prisma.invoice.groupBy({
      by: ['quotation_id'],
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        status: 'paid',
      },
    });
    const quotationIdsWithPaidInvoice = new Set(
      clientsWithInvoices
        .map((i) => i.quotation_id)
        .filter(Boolean) as string[],
    );

    // Get client IDs that have at least one paid invoice
    const quotationsWithClients = await this.prisma.quotation.findMany({
      where: {
        id: { in: Array.from(quotationIdsWithPaidInvoice) },
        tenant_id: tenantId,
      },
      select: { client_id: true },
    });
    const clientIdsWithPaidInvoice = new Set(
      quotationsWithClients.map((q) => q.client_id),
    );

    const inactiveClients = allClients
      .filter((client) => {
        if (!clientIdsWithPaidInvoice.has(client.id)) return false;

        const lastQuoteDate =
          client.quotations.length > 0
            ? new Date(client.quotations[0].updated_at)
            : null;
        const lastRfqDate =
          client.rfqs.length > 0
            ? new Date(client.rfqs[0].created_at)
            : null;

        const lastActivity = lastQuoteDate && lastRfqDate
          ? new Date(
              Math.max(lastQuoteDate.getTime(), lastRfqDate.getTime()),
            )
          : lastQuoteDate || lastRfqDate;

        return !lastActivity || lastActivity < thirtyDaysAgo;
      })
      .map((client) => {
        const lastQuoteDate =
          client.quotations.length > 0
            ? new Date(client.quotations[0].updated_at)
            : null;
        const lastRfqDate =
          client.rfqs.length > 0
            ? new Date(client.rfqs[0].created_at)
            : null;
        const lastActivity = lastQuoteDate && lastRfqDate
          ? new Date(
              Math.max(lastQuoteDate.getTime(), lastRfqDate.getTime()),
            )
          : lastQuoteDate || lastRfqDate;

        return {
          id: client.id,
          name: client.name,
          lastActivityDate: lastActivity
            ? lastActivity.toISOString()
            : null,
          totalHistoricalValue: Number(client.total_value),
        };
      });

    return {
      staleQuotes,
      overdueInvoices: overdueInvoicesList,
      inactiveClients,
    };
  }

  async getDemandForecast(tenantId: string, productId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);

    const rfqItems = await this.prisma.rFQItem.findMany({
      where: {
        product_id: productId,
        deleted_at: null,
        rfq: {
          tenant_id: tenantId,
          deleted_at: null,
          created_at: { gte: sixMonthsAgo },
        },
      },
      include: {
        rfq: { select: { created_at: true } },
      },
    });

    // Group by month
    const monthlyDemand: { month: string; count: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const count = rfqItems.filter((item) => {
        const itemDate = new Date(item.rfq.created_at);
        return (
          itemDate.getFullYear() === d.getFullYear() &&
          itemDate.getMonth() === d.getMonth()
        );
      }).length;
      monthlyDemand.push({ month: monthKey, count });
    }

    // Simple trend: last 3 months avg vs previous 3 months avg
    const recent3 = monthlyDemand.slice(-3);
    const previous3 = monthlyDemand.slice(0, 3);

    const recentAvg =
      recent3.reduce((sum, m) => sum + m.count, 0) / (recent3.length || 1);
    const previousAvg =
      previous3.reduce((sum, m) => sum + m.count, 0) /
      (previous3.length || 1);

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (previousAvg > 0) {
      const change = ((recentAvg - previousAvg) / previousAvg) * 100;
      if (change > 10) trend = 'increasing';
      else if (change < -10) trend = 'decreasing';
    } else if (recentAvg > 0) {
      trend = 'increasing';
    }

    const nextMonthEstimate = Math.round(recentAvg);

    return {
      monthlyDemand,
      trend,
      nextMonthEstimate,
    };
  }
}
