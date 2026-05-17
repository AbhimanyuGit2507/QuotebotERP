import { PrismaService } from '../../prisma.service';
export declare class ZohoService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private normalizeExternalId;
    private normalizeSku;
    private isRecord;
    private getString;
    private getNumber;
    private encodeState;
    private decodeState;
    getAuthorizationUrl(tenantId?: string, userId?: string): {
        authorizationUrl: string;
    };
    handleCallback(code: string, state?: string): Promise<{
        ok: boolean;
        data: Record<string, unknown>;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
        data?: undefined;
    }>;
    exchangeCode(code: string, tenantId?: string): Promise<{
        ok: boolean;
        data: Record<string, unknown>;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
        data?: undefined;
    }>;
    private zohoApiDomain;
    private refreshAccessTokenIfNeeded;
    private getIntegrationForTenant;
    listCustomers(tenantId: string): Promise<{
        ok: boolean;
        data: any;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
        data?: undefined;
    }>;
    listItems(tenantId: string): Promise<{
        ok: boolean;
        data: any;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
        data?: undefined;
    }>;
    importCustomers(tenantId: string, overrides?: Array<{
        externalId: string;
        localEntity: string;
        localId: string;
    }>): Promise<{
        ok: boolean;
        error: string;
        results?: undefined;
    } | {
        ok: boolean;
        results: {
            created: number;
            updated: number;
            skipped: number;
            errors: any[];
        };
        error?: undefined;
    }>;
    importItems(tenantId: string, overrides?: Array<{
        externalId: string;
        localEntity: string;
        localId: string;
    }>): Promise<{
        ok: boolean;
        error: string;
        results?: undefined;
    } | {
        ok: boolean;
        results: {
            created: number;
            updated: number;
            skipped: number;
            errors: any[];
        };
        error?: undefined;
    }>;
}
