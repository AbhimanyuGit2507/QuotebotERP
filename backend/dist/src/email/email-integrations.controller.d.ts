import type { Request, Response } from 'express';
import { EmailService } from './email.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
export declare class EmailIntegrationsController {
    private emailService;
    constructor(emailService: EmailService);
    getEmailAccounts(req: Request & {
        user: AuthenticatedUser;
    }): Promise<{
        id: string;
        provider: string;
        email_address: string;
        is_active: boolean;
        created_at: Date;
    }[]>;
    getSyncStatus(req: Request & {
        user: AuthenticatedUser;
    }): Record<string, unknown>;
    triggerSyncNow(req: Request & {
        user: AuthenticatedUser;
    }): {
        started: boolean;
        reason: string;
        status: Record<string, unknown>;
    } | {
        started: boolean;
        reason: string;
        status?: undefined;
    };
    clearInbox(req: Request & {
        user: AuthenticatedUser;
    }): Promise<{
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
    authorizeOAuth(req: Request & {
        user: AuthenticatedUser;
    }, res: Response): Response<any, Record<string, any>>;
    oauthCallback(code: string, state: string, req: Request, res: Response): Promise<void | Response<any, Record<string, any>>>;
    disconnectEmailAccount(accountId: string, req: Request & {
        user: AuthenticatedUser;
    }): Promise<{
        success: boolean;
        id: string;
    }>;
}
