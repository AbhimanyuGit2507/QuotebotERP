import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { InboundEmailDto } from './dtos/inbound-email.dto';
import { OutboundEmailUpdateDto } from './dtos/outbound-email-update.dto';
export declare class EmailService {
    private prisma;
    constructor(prisma: PrismaService);
    private buildMimePart;
    private encodeMimeBase64;
    private buildRawMimeMessage;
    private getOrCreateInboxPlaceholderClient;
    private parseReceivedAt;
    private getSyncStatusFilePath;
    getGmailSyncStatus(tenantId: string): Record<string, unknown>;
    triggerImmediateGmailSync(tenantId: string): {
        started: boolean;
        reason: string;
        status: Record<string, unknown>;
    } | {
        started: boolean;
        reason: string;
        status?: undefined;
    };
    clearInboxData(tenantId: string): Promise<{
        cleared: boolean;
        tenantId: string;
        before: {
            messages: number;
            conversations: number;
        };
        after: {
            messages: number;
            conversations: number;
        };
    }>;
    private readCredentials;
    getActiveEmailAccounts(tenantId: string): Promise<{
        id: string;
        access_token: string | undefined;
        expires_at: string | null;
    }[]>;
    refreshEmailAccountAccessToken(accountId: string, tenantId: string): Promise<{
        id: string;
        access_token: unknown;
        expires_at: {} | null;
    }>;
    initiateGoogleOAuth(state: string): string;
    handleGoogleOAuthCallback(code: string, state: string, tenantId: string, userId: string): Promise<{
        id: string;
        provider: string;
        email_address: string;
    }>;
    getUserEmailAccounts(tenantId: string, userId: string): Promise<{
        id: string;
        provider: string;
        email_address: string;
        is_active: boolean;
        created_at: Date;
    }[]>;
    disconnectEmailAccount(accountId: string, tenantId: string, userId: string): Promise<{
        success: boolean;
        id: string;
    }>;
    processInboundEmail(tenantId: string | undefined, dto: InboundEmailDto): Promise<{
        message: unknown;
        conversation: {
            id: string;
        };
        client: {
            id: string;
        };
        is_duplicate: boolean;
    }>;
    getPendingOutboundEmails(tenantId?: string, limit?: number): Promise<{
        id: string;
        tenant_id: string;
        email_account_id: string;
        provider: string;
        access_token: string | undefined;
        to: string[];
        cc: string[] | undefined;
        subject: string;
        body: string;
        attempts: number;
    }[]>;
    updateOutboundEmailStatus(tenantId: string | undefined, emailId: string, update: OutboundEmailUpdateDto): Promise<{
        status: string;
        tenant_id: string;
        id: string;
        provider: string | null;
        created_at: Date;
        updated_at: Date;
        email_account_id: string;
        to: Prisma.JsonValue;
        cc: Prisma.JsonValue | null;
        subject: string;
        body: string;
        attempts: number;
        last_error: string | null;
        sent_at: Date | null;
    }>;
    createOutboundEmail(tenantId: string, data: {
        email_account_id: string;
        to: string[];
        cc?: string[];
        subject: string;
        body: string;
    }): Promise<{
        status: string;
        tenant_id: string;
        id: string;
        provider: string | null;
        created_at: Date;
        updated_at: Date;
        email_account_id: string;
        to: Prisma.JsonValue;
        cc: Prisma.JsonValue | null;
        subject: string;
        body: string;
        attempts: number;
        last_error: string | null;
        sent_at: Date | null;
    }>;
    sendNow(tenantId: string, data: {
        email_account_id: string;
        to: string[];
        cc?: string[];
        subject: string;
        body: string;
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
    }): Promise<{
        success: boolean;
        outbound_id: string;
        provider_response: Record<string, unknown>;
    }>;
}
