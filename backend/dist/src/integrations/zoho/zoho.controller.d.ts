import { Request } from 'express';
import { ZohoService } from './zoho.service';
type AuthRequest = Request & {
    user?: {
        id?: string;
        tenant_id?: string;
    };
};
type ZohoResult = {
    ok: boolean;
    data?: unknown;
    error?: string;
    rows?: unknown;
};
export declare class ZohoController {
    private readonly zohoService;
    constructor(zohoService: ZohoService);
    getAuthUrl(req: AuthRequest): {
        authorizationUrl: string;
    };
    callback(code: string, state?: string): Promise<ZohoResult>;
    exchangeCode(body: {
        code: string;
        tenant_id?: string;
    }): Promise<ZohoResult>;
    listCustomers(req: AuthRequest): Promise<ZohoResult>;
    listItems(req: AuthRequest): Promise<ZohoResult>;
    importCustomers(req: AuthRequest, body?: {
        overrides?: Array<{
            externalId: string;
            localEntity: string;
            localId: string;
        }>;
    }): Promise<ZohoResult>;
    importItems(req: AuthRequest, body?: {
        overrides?: Array<{
            externalId: string;
            localEntity: string;
            localId: string;
        }>;
    }): Promise<ZohoResult>;
    previewCustomers(req: AuthRequest): Promise<ZohoResult>;
    previewItems(req: AuthRequest): Promise<ZohoResult>;
}
export {};
