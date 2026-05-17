import type { Request } from 'express';
import { EmailService } from './email.service';
import { InboundEmailDto } from './dtos/inbound-email.dto';
import { OutboundEmailUpdateDto } from './dtos/outbound-email-update.dto';
export declare class EmailController {
    private emailService;
    constructor(emailService: EmailService);
    inboundEmail(req: Request, dto: InboundEmailDto): Promise<{
        success: boolean;
        message: unknown;
        conversation_id: string;
        client_id: string;
        is_duplicate: boolean;
    }>;
    getOutboundEmails(req: Request, status?: string, limit?: string): Promise<{
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
    updateOutboundEmailStatus(req: Request, emailId: string, dto: OutboundEmailUpdateDto): Promise<{
        success: boolean;
        data: {
            status: string;
            tenant_id: string;
            id: string;
            provider: string | null;
            created_at: Date;
            updated_at: Date;
            email_account_id: string;
            to: import("@prisma/client/runtime/client").JsonValue;
            cc: import("@prisma/client/runtime/client").JsonValue | null;
            subject: string;
            body: string;
            attempts: number;
            last_error: string | null;
            sent_at: Date | null;
        };
    }>;
}
