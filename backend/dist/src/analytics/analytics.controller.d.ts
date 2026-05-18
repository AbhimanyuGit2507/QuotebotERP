import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    salesTrends(user: AuthenticatedUser): Promise<{
        date: Date;
        total: import("@prisma/client-runtime-utils").Decimal;
        status: string;
    }[]>;
    rfqAnalysis(user: AuthenticatedUser): Promise<{
        total: number;
        byStatus: Record<string, number>;
        byChannel: Record<string, number>;
        avgConfidence: number;
    }>;
    quotePerformance(user: AuthenticatedUser): Promise<{
        totalQuotes: number;
        acceptedQuotes: number;
        acceptanceRate: number;
        totalValue: number;
        averageValue: number;
    }>;
    productPerformance(user: AuthenticatedUser): Promise<{
        id: string;
        name: string;
        sku: string;
        category: string;
        quoteCount: number;
        stock: number;
        price: import("@prisma/client-runtime-utils").Decimal;
    }[]>;
    clientInsights(user: AuthenticatedUser): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        email: string;
        tenant_id: string;
        deleted_at: Date | null;
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
        total_value: import("@prisma/client-runtime-utils").Decimal;
        last_order_date: Date | null;
    }[]>;
    channelBreakdown(user: AuthenticatedUser): Promise<Record<string, number>>;
    exportCsv(report: string, user: AuthenticatedUser, res: Response): Promise<Response<any, Record<string, any>>>;
}
