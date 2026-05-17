import { PrismaService } from '../../prisma.service';
export declare class OdooService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    testConnection(payload: {
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
    private callJsonRpc;
    login(url: string, db: string, username: string, password: string): Promise<any>;
    listPartners(opts: {
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
    listProducts(opts: {
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
    importPartners(tenantId: string, partners: any[], overrides?: Array<{
        externalId: string;
        localEntity: string;
        localId: string;
    }>): Promise<{
        ok: boolean;
        results: {
            created: number;
            updated: number;
            errors: any[];
        };
    }>;
    importProducts(tenantId: string, products: any[], overrides?: Array<{
        externalId: string;
        localEntity: string;
        localId: string;
    }>): Promise<{
        ok: boolean;
        results: {
            created: number;
            updated: number;
            errors: any[];
        };
    }>;
}
