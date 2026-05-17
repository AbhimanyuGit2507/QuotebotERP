import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    salesTrends(user: AuthenticatedUser): Promise<{
        date: string;
        total: number;
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
        price: number;
    }[]>;
    clientInsights(user: AuthenticatedUser): Promise<{
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
    channelBreakdown(user: AuthenticatedUser): Promise<Record<string, number>>;
    exportCsv(report: string, user: AuthenticatedUser, res: Response): Promise<Response<any, Record<string, any>>>;
}
