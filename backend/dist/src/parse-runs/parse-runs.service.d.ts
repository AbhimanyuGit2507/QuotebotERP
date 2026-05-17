import { PrismaService } from '../prisma.service';
interface ParseRunsQuery {
    stage?: string;
    status?: string;
    message_id?: string;
    source?: string;
    limit?: number;
}
export declare class ParseRunsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string, query: ParseRunsQuery): Promise<{
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
    }[]>;
    cleanupOldRuns(tenantId: string, keepDays?: number): Promise<{
        deleted_count: number;
        cutoff: string;
        keep_days: number;
    }>;
    summary(tenantId: string, lookbackDays?: number): Promise<{
        lookback_days: number;
        since: string;
        totals: {
            attempts: number;
            matched_lines: number;
            unmatched_lines: number;
        };
        by_stage_status: {
            stage: string;
            status: string;
            count: number;
        }[];
    }>;
}
export {};
