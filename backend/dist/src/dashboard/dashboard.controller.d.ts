import { DashboardService } from './dashboard.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getKpis(user: AuthenticatedUser): Promise<{
        totalRfqs: number;
        quotesSent: number;
        acceptedQuotes: number;
        declinedQuotes: number;
        activeProducts: number;
        clients: number;
        openInvoices: number;
        paidInvoices: number;
    }>;
    getRfqVsQuotes(user: AuthenticatedUser): Promise<{
        date: string;
        rfqs: number;
        quotes: number;
    }[]>;
    getQuoteStatus(user: AuthenticatedUser): Promise<{
        status: string;
        count: number;
    }[]>;
    getRfqByChannel(user: AuthenticatedUser): Promise<{
        channel: string;
        count: number;
    }[]>;
    getActivityFeed(user: AuthenticatedUser): Promise<({
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
    getSystemStatus(user: AuthenticatedUser): Promise<{
        database: string;
        pendingRfqs: number;
        draftQuotes: number;
        files: number;
        auth: string;
    }>;
}
