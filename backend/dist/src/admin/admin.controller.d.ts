import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    overview(user: AuthenticatedUser): Promise<{
        counts: {
            users: number;
            rfqs: number;
            quotations: number;
            clients: number;
            products: number;
            parseRuns: number;
            outboundEmails: number;
            activities: number;
            auditLogs: number;
            invoices: number;
            openInvoices: number;
            paidInvoices: number;
            partialInvoices: number;
            cancelledInvoices: number;
        };
        delivery: {
            pendingOutbound: number;
            sentOutbound: number;
            failedOutbound: number;
        };
        parsing: {
            failedRuns: number;
            recentRuns: {
                source: string | null;
                id: string;
                created_at: Date;
                status: string;
                stage: string;
                matched_count: number;
                unmatched_count: number;
                error_message: string | null;
            }[];
        };
        rfqTiming: {
            window_days: number;
            count: number;
            avg_ms: number | null;
            p50_ms: number | null;
            p95_ms: number | null;
            best_ms: number | null;
            worst_ms: number | null;
        };
    }>;
    users(user: AuthenticatedUser): Promise<{
        id: string;
        name: string;
        email: string;
        role: string;
        status: string;
        created_at: Date;
        updated_at: Date;
    }[]>;
    logs(user: AuthenticatedUser): Promise<{
        activities: ({
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
        })[];
        auditLogs: ({
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
            before_json: string | null;
            after_json: string | null;
        })[];
        parseRuns: {
            source: string | null;
            id: string;
            created_at: Date;
            tenant_id: string;
            status: string;
            message_id: string | null;
            client_email: string | null;
            stage: string;
            matched_count: number;
            unmatched_count: number;
            input_items_json: import("@prisma/client/runtime/client").JsonValue | null;
            matched_items_json: import("@prisma/client/runtime/client").JsonValue | null;
            unmatched_items_json: import("@prisma/client/runtime/client").JsonValue | null;
            error_message: string | null;
        }[];
        outboundEmails: {
            id: string;
            created_at: Date;
            updated_at: Date;
            tenant_id: string;
            status: string;
            body: string;
            sent_at: Date | null;
            email_account_id: string;
            provider: string | null;
            subject: string;
            last_error: string | null;
            attempts: number;
            to: import("@prisma/client/runtime/client").JsonValue;
            cc: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    }>;
    llms(user: AuthenticatedUser): Promise<{
        provider: string;
        model: string | null;
        configured: boolean;
        status: "configured" | "missing_key" | "na";
        queries_today: number | null;
        failed_today?: number | null;
        remaining_quota: number | null;
        exhausted: boolean | null;
        base_url: string | null;
    }[]>;
}
