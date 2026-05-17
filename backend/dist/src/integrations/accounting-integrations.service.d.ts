import { PrismaService } from '../prisma.service';
type AccountingIntegrationStatusRow = {
    provider: 'xero' | 'quickbooks';
    status: string;
    expires_at: Date | null;
    updated_at: Date;
};
export declare class AccountingIntegrationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private ensureXeroConfigured;
    private ensureQuickBooksConfigured;
    private encodeState;
    private decodeState;
    private parseTokenResponse;
    getStatus(tenantId: string): Promise<{
        xero: AccountingIntegrationStatusRow | null;
        quickbooks: AccountingIntegrationStatusRow | null;
    }>;
    getXeroAuthorizeUrl(tenantId: string, userId: string): {
        authorizationUrl: string;
    };
    getQuickBooksAuthorizeUrl(tenantId: string, userId: string): {
        authorizationUrl: string;
    };
    handleXeroCallback(code: string, state?: string): Promise<{
        success: boolean;
    }>;
    handleQuickBooksCallback(code: string, state?: string, realmId?: string): Promise<{
        success: boolean;
    }>;
    exportInvoiceToXero(tenantId: string, invoiceId: string): Promise<{
        provider: string;
        status: string;
        message: string;
        export_id: string;
        external_id: string | undefined;
    }>;
    exportInvoiceToQuickBooks(tenantId: string, invoiceId: string): Promise<{
        provider: string;
        status: string;
        message: string;
        export_id: string;
        external_id: string | undefined;
    }>;
}
export default AccountingIntegrationsService;
