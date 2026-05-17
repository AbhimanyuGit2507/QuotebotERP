import { AssistanceTicketStatus, FollowupType, MessageClassification, Prisma } from '@prisma/client';
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
        conversation_id: string;
        email_account_id: string | null;
        external_id: string | null;
        thread_id: string | null;
        provider: string | null;
        sender_email: string;
        sender_name: string;
        raw_payload: Prisma.JsonValue | null;
        sender_id: string | null;
        channel: string;
        recipients: string | null;
        is_read: boolean;
        message_id_header: string | null;
        in_reply_to: string | null;
        references_header: string | null;
        attachments_json: Prisma.JsonValue | null;
        is_processed: boolean;
        processing_status: string;
        direction: string;
        workflow_direction: import("@prisma/client").$Enums.MessageDirection;
        classification: import("@prisma/client").$Enums.MessageClassification;
        classification_confidence: number | null;
        followup_type: import("@prisma/client").$Enums.FollowupType | null;
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
        conversation_id: string;
        email_account_id: string | null;
        external_id: string | null;
        thread_id: string | null;
        provider: string | null;
        sender_email: string;
        sender_name: string;
        raw_payload: Prisma.JsonValue | null;
        sender_id: string | null;
        channel: string;
        recipients: string | null;
        is_read: boolean;
        message_id_header: string | null;
        in_reply_to: string | null;
        references_header: string | null;
        attachments_json: Prisma.JsonValue | null;
        is_processed: boolean;
        processing_status: string;
        direction: string;
        workflow_direction: import("@prisma/client").$Enums.MessageDirection;
        classification: import("@prisma/client").$Enums.MessageClassification;
        classification_confidence: number | null;
        followup_type: import("@prisma/client").$Enums.FollowupType | null;
    }>;
    getInboxIntelligence(tenantId: string, classification?: MessageClassification): Promise<{
        summary: {
            RFQ: number;
            FOLLOWUP: number;
            PO: number;
            UNKNOWN: number;
        };
        items: {
            id: string;
            classification: import("@prisma/client").$Enums.MessageClassification;
            confidence: number | null;
            followup_type: import("@prisma/client").$Enums.FollowupType | null;
            sender_email: string;
            sender_name: string;
            body_preview: string;
            created_at: Date;
            conversation: {
                id: string;
                status: string;
                subject: string;
                customer_email: string | null;
                customer_name: string | null;
                current_stage: import("@prisma/client").$Enums.ConversationStage;
                assigned_operator_id: string | null;
            };
        }[];
    }>;
    getManualAssistanceQueue(tenantId: string, status?: AssistanceTicketStatus, type?: FollowupType): Promise<{
        id: string;
        type: import("@prisma/client").$Enums.FollowupType;
        status: import("@prisma/client").$Enums.AssistanceTicketStatus;
        assigned_to: {
            name: string;
            id: string;
            email: string;
        } | null;
        created_at: Date;
        updated_at: Date;
        conversation: {
            id: string;
            status: string;
            subject: string;
            customer_email: string | null;
            customer_name: string | null;
            current_stage: import("@prisma/client").$Enums.ConversationStage;
        };
        latest_message: {
            id: string;
            sender_email: string;
            sender_name: string;
            body_preview: string;
            created_at: Date;
        };
    }[]>;
    assignAssistanceTicket(id: string, tenantId: string, assignedToId?: string): Promise<{
        assigned_to: {
            name: string;
            id: string;
            email: string;
        } | null;
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        status: import("@prisma/client").$Enums.AssistanceTicketStatus;
        type: import("@prisma/client").$Enums.FollowupType;
        conversation_id: string;
        message_id: string;
        assigned_to_id: string | null;
    }>;
    updateAssistanceTicketStatus(id: string, tenantId: string, status: AssistanceTicketStatus): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        status: import("@prisma/client").$Enums.AssistanceTicketStatus;
        type: import("@prisma/client").$Enums.FollowupType;
        conversation_id: string;
        message_id: string;
        assigned_to_id: string | null;
    }>;
    getMessageThread(messageId: string, tenantId: string): Promise<{
        messages: {
            id: string;
            sender: string;
            sender_email: string;
            subject: {};
            preview: string;
            timestamp: string;
            direction: string;
            classification: import("@prisma/client").$Enums.MessageClassification;
            is_read: boolean;
        }[];
        conversation_id: string;
        total: number;
    }>;
}
export {};
