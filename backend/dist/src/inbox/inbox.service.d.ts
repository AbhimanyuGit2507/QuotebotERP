import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
type RetryHistoryEntry = {
    retried_at: string;
    retried_by: string;
    reason: string;
    previous_processing_status: 'pending' | 'parsed' | 'failed';
    previous_parsing_source?: string;
    previous_parsing_error?: string;
    previous_item_count?: number;
    forced: boolean;
};
export declare class InboxService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private stripHtmlTags;
    private readRawPayload;
    private normalizeParsedItems;
    private normalizeRejectedItems;
    private normalizeRetryCount;
    private normalizeRetryHistory;
    findMessagesForProcessing(tenantId: string, processingStatus?: 'pending' | 'parsed' | 'failed'): Promise<{
        id: string;
        email_account_id: string | null;
        external_id: string | null;
        thread_id: string | null;
        sender_email: string;
        sender_name: string;
        subject: string;
        body: string;
        raw_payload: Prisma.JsonValue;
        created_at: Date;
        processing_status: string;
    }[]>;
    private formatRelativeTime;
    private formatAbsoluteTime;
    findMessages(tenantId: string): Promise<{
        id: string;
        channel: string;
        sender: string;
        from: string;
        subject: string;
        preview: string;
        content: string;
        contentHtml: string | undefined;
        timestamp: string;
        relativeTime: string;
        status: "new" | "failed" | "parsed" | "needs_review";
        isRead: boolean;
        confidence: number;
        extractedItems: number;
        parsedItems: ({
            status: "matched";
            product_name: string;
            quantity: number;
            unit?: string;
            notes?: string;
        } | {
            product_name: string;
            quantity: number;
            status: "rejected";
            reason: string;
        })[];
        parsingSource: string;
        parsingConfidence: string;
        parsingError: string;
        rfqId: string;
        quotationId: string;
        autoRfqCreated: boolean;
        autoQuotationCreated: boolean;
        retryCount: number;
        lastRetryAt: string;
        retryHistory: RetryHistoryEntry[];
        attachments: string[];
    }[]>;
    retryMessageParsing(id: string, tenantId: string, body: {
        force_retry?: boolean;
        reason?: string;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        body: string;
        email_account_id: string | null;
        external_id: string | null;
        thread_id: string | null;
        provider: string | null;
        sender_email: string;
        sender_name: string;
        raw_payload: Prisma.JsonValue | null;
        conversation_id: string;
        sender_id: string | null;
        channel: string;
        is_read: boolean;
        is_processed: boolean;
        processing_status: string;
        direction: string;
    }>;
    retrySourceMessageByRfqId(rfqId: string, tenantId: string, body: {
        force_retry?: boolean;
        reason?: string;
    }): Promise<{
        rfq_id: string;
        message_id: string;
        status: string;
    }>;
    updateMessageProcessingStatus(id: string, tenantId: string, body: {
        processing_status: 'pending' | 'parsed' | 'failed';
        parsed_items?: Array<{
            product_name?: string;
            name?: string;
            quantity: number;
            unit?: string;
            notes?: string;
        }>;
        parsing_source?: string;
        parsing_confidence?: string;
        parsing_error?: string;
        rfq_id?: string;
        quotation_id?: string;
        auto_rfq_created?: boolean;
        auto_quotation_created?: boolean;
        force_retry?: boolean;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        body: string;
        email_account_id: string | null;
        external_id: string | null;
        thread_id: string | null;
        provider: string | null;
        sender_email: string;
        sender_name: string;
        raw_payload: Prisma.JsonValue | null;
        conversation_id: string;
        sender_id: string | null;
        channel: string;
        is_read: boolean;
        is_processed: boolean;
        processing_status: string;
        direction: string;
    }>;
}
export {};
