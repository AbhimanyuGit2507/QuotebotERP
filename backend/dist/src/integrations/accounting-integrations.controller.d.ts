import type { Request } from 'express';
import { AccountingIntegrationsService } from './accounting-integrations.service';
type AuthRequest = Request & {
    user?: {
        id?: string;
        tenant_id?: string;
    };
};
export declare class AccountingIntegrationsController {
    private readonly integrationsService;
    constructor(integrationsService: AccountingIntegrationsService);
    status(req: AuthRequest): Promise<{
        xero: {
            provider: "xero" | "quickbooks";
            status: string;
            expires_at: Date | null;
            updated_at: Date;
        } | null;
        quickbooks: {
            provider: "xero" | "quickbooks";
            status: string;
            expires_at: Date | null;
            updated_at: Date;
        } | null;
    }>;
    authorizeXero(req: AuthRequest): {
        authorizationUrl: string;
    };
    authorizeQuickBooks(req: AuthRequest): {
        authorizationUrl: string;
    };
    xeroCallback(code: string, state?: string): Promise<{
        success: boolean;
    }>;
    quickbooksCallback(code: string, state?: string, realmId?: string): Promise<{
        success: boolean;
    }>;
    exportInvoiceToXero(req: AuthRequest, id: string): Promise<{
        provider: string;
        status: string;
        message: string;
        export_id: string;
        external_id: string | undefined;
    }>;
    exportInvoiceToQuickBooks(req: AuthRequest, id: string): Promise<{
        provider: string;
        status: string;
        message: string;
        export_id: string;
        external_id: string | undefined;
    }>;
}
export default AccountingIntegrationsController;
