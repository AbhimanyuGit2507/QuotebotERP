import { PrismaService } from '../prisma.service';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getKpis(tenantId: string): Promise<{
        totalRfqs: number;
        quotesSent: number;
        acceptedQuotes: number;
        declinedQuotes: number;
        activeProducts: number;
        clients: number;
        openInvoices: number;
        paidInvoices: number;
    }>;
    getRfqVsQuotes(tenantId: string): Promise<{
        date: string;
        rfqs: number;
        quotes: number;
    }[]>;
    getQuoteStatus(tenantId: string): Promise<{
        status: string;
        count: number;
    }[]>;
    getRfqByChannel(tenantId: string): Promise<{
        channel: string;
        count: number;
    }[]>;
    getActivityFeed(tenantId: string): Promise<({
        user: {
            name: string;
            id: string;
            created_at: Date;
            updated_at: Date;
            email: string;
            tenant_id: string;
            password_hash: string;
            role_id: string;
            status: string;
            permissions: import("@prisma/client/runtime/client").JsonValue | null;
        } | null;
    } & {
        id: string;
        created_at: Date;
        tenant_id: string;
        user_id: string | null;
        action: string;
        entity_type: string;
        entity_id: string;
    })[]>;
    getSystemStatus(tenantId: string): Promise<{
        database: string;
        pendingRfqs: number;
        draftQuotes: number;
        files: number;
        auth: string;
    }>;
}
