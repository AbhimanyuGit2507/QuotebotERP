import { PrismaService } from '../prisma.service';
export declare class AnalyticsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    salesTrends(tenantId: string): Promise<{
        date: string;
        total: number;
        status: string;
    }[]>;
    rfqAnalysis(tenantId: string): Promise<{
        total: number;
        byStatus: Record<string, number>;
        byChannel: Record<string, number>;
        avgConfidence: number;
    }>;
    quotePerformance(tenantId: string): Promise<{
        totalQuotes: number;
        acceptedQuotes: number;
        acceptanceRate: number;
        totalValue: number;
        averageValue: number;
    }>;
    productPerformance(tenantId: string): Promise<{
        id: string;
        name: string;
        sku: string;
        category: string;
        quoteCount: number;
        stock: number;
        price: number;
    }[]>;
    clientInsights(tenantId: string): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        email: string;
        tenant_id: string;
        state: string | null;
        tier: string;
        type: string;
        phone: string | null;
        website: string | null;
        address: string | null;
        city: string | null;
        gst: string | null;
        pan: string | null;
        total_orders: number;
        total_value: number;
        last_order_date: Date | null;
    }[]>;
    channelBreakdown(tenantId: string): Promise<Record<string, number>>;
    exportCsv(tenantId: string, report: string): Promise<string>;
}
