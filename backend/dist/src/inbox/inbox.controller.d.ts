import { InboxService } from './inbox.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpdateMessageProcessingStatusDto } from './dtos/update-message-processing-status.dto';
import { RetryMessageDto } from './dtos/retry-message.dto';
import { AssistanceTicketStatus, FollowupType, MessageClassification } from '@prisma/client';
import { AssignAssistanceTicketDto } from './dtos/assign-assistance-ticket.dto';
import { UpdateAssistanceTicketStatusDto } from './dtos/update-assistance-ticket-status.dto';
export declare class InboxController {
    private readonly inboxService;
    constructor(inboxService: InboxService);
    getInboxIntelligence(user: AuthenticatedUser, classification?: MessageClassification): Promise<{
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
    getManualAssistanceQueue(user: AuthenticatedUser, status?: AssistanceTicketStatus, type?: FollowupType): Promise<{
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
    assignAssistanceTicket(id: string, user: AuthenticatedUser, body: AssignAssistanceTicketDto): Promise<{
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
    updateAssistanceTicketStatus(id: string, user: AuthenticatedUser, body: UpdateAssistanceTicketStatusDto): Promise<{
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
    findMessages(user: AuthenticatedUser, processingStatus?: 'pending' | 'parsed' | 'failed'): Promise<{
        id: string;
        email_account_id: string | null;
        external_id: string | null;
        thread_id: string | null;
        sender_email: string;
        sender_name: string;
        subject: string;
        body: string;
        raw_payload: import("@prisma/client/runtime/client").JsonValue;
        created_at: Date;
        processing_status: string;
    }[]> | Promise<{
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
        retryHistory: {
            retried_at: string;
            retried_by: string;
            reason: string;
            previous_processing_status: "pending" | "parsed" | "failed";
            previous_parsing_source?: string;
            previous_parsing_error?: string;
            previous_item_count?: number;
            forced: boolean;
        }[];
        attachments: string[];
    }[]>;
    getMessageThread(id: string, user: AuthenticatedUser): Promise<{
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
    updateMessageProcessingStatus(id: string, user: AuthenticatedUser, body: UpdateMessageProcessingStatusDto): Promise<{
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
        raw_payload: import("@prisma/client/runtime/client").JsonValue | null;
        sender_id: string | null;
        channel: string;
        recipients: string | null;
        is_read: boolean;
        message_id_header: string | null;
        in_reply_to: string | null;
        references_header: string | null;
        attachments_json: import("@prisma/client/runtime/client").JsonValue | null;
        is_processed: boolean;
        processing_status: string;
        direction: string;
        workflow_direction: import("@prisma/client").$Enums.MessageDirection;
        classification: import("@prisma/client").$Enums.MessageClassification;
        classification_confidence: number | null;
        followup_type: import("@prisma/client").$Enums.FollowupType | null;
    }>;
    retryMessageParsing(id: string, user: AuthenticatedUser, body: RetryMessageDto): Promise<{
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
        raw_payload: import("@prisma/client/runtime/client").JsonValue | null;
        sender_id: string | null;
        channel: string;
        recipients: string | null;
        is_read: boolean;
        message_id_header: string | null;
        in_reply_to: string | null;
        references_header: string | null;
        attachments_json: import("@prisma/client/runtime/client").JsonValue | null;
        is_processed: boolean;
        processing_status: string;
        direction: string;
        workflow_direction: import("@prisma/client").$Enums.MessageDirection;
        classification: import("@prisma/client").$Enums.MessageClassification;
        classification_confidence: number | null;
        followup_type: import("@prisma/client").$Enums.FollowupType | null;
    }>;
    retryRfqSourceMessage(rfqId: string, user: AuthenticatedUser, body: RetryMessageDto): Promise<{
        rfq_id: string;
        message_id: string;
        status: string;
    }>;
}
