import type { Request } from 'express';
import { EmailService } from './email.service';
type AuthRequest = Request & {
    user?: {
        tenant_id?: string;
    };
};
type SendEmailBody = {
    email_account_id: string;
    to: string[];
    cc?: string[];
    subject?: string;
    body?: string;
};
export declare class UserEmailController {
    private readonly emailService;
    constructor(emailService: EmailService);
    sendEmail(req: AuthRequest, body: SendEmailBody): Promise<{
        success: boolean;
        outbound_id: string;
        provider_response: Record<string, unknown>;
    }>;
}
export {};
