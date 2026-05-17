import type { Request } from 'express';
import { OdooService } from './odoo.service';
type AuthRequest = Request & {
    user?: {
        tenant_id?: string;
    };
};
export declare class OdooController {
    private readonly odooService;
    constructor(odooService: OdooService);
    testConnection(body: {
        url: string;
        db?: string;
        username?: string;
        password?: string;
    }): Promise<{
        ok: boolean;
        data: any;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
        data?: undefined;
    }>;
    listPartners(body: {
        url: string;
        db: string;
        username: string;
        password: string;
        limit?: number;
    }): Promise<{
        ok: boolean;
        error: string;
        data?: undefined;
    } | {
        ok: boolean;
        data: any;
        error?: undefined;
    }>;
    listProducts(body: {
        url: string;
        db: string;
        username: string;
        password: string;
        limit?: number;
    }): Promise<{
        ok: boolean;
        error: string;
        data?: undefined;
    } | {
        ok: boolean;
        data: any;
        error?: undefined;
    }>;
    importPartners(req: AuthRequest, body: {
        partners: any[];
        overrides?: Array<{
            externalId: string;
            localEntity: string;
            localId: string;
        }>;
    }): Promise<{
        ok: boolean;
        results: {
            created: number;
            updated: number;
            errors: any[];
        };
    }>;
    importProducts(req: AuthRequest, body: {
        products: any[];
        overrides?: Array<{
            externalId: string;
            localEntity: string;
            localId: string;
        }>;
    }): Promise<{
        ok: boolean;
        results: {
            created: number;
            updated: number;
            errors: any[];
        };
    }>;
}
export {};
