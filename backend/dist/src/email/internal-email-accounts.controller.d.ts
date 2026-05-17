import type { Request } from 'express';
import { EmailService } from './email.service';
export declare class InternalEmailAccountsController {
    private readonly emailService;
    constructor(emailService: EmailService);
    getEmailAccounts(req: Request): Promise<{
        id: string;
        access_token: string | undefined;
        expires_at: string | null;
    }[]>;
    refreshEmailAccount(req: Request, id: string): Promise<{
        id: string;
        access_token: unknown;
        expires_at: {} | null;
    }>;
}
