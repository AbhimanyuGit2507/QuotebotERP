import { PrismaService } from '../prisma.service';
type ImportEntity = 'clients' | 'products';
interface ImportPreviewRequest {
    entity: ImportEntity;
    rows: Array<Record<string, unknown>>;
}
interface ImportCommitRequest {
    entity: ImportEntity;
    rows: Array<Record<string, unknown>>;
}
type ImportError = {
    rowIndex: number;
    messages: string[];
};
type ClientRow = {
    name: string;
    email: string;
    type?: string;
    phone?: string;
    gst?: string;
    address?: string;
    city?: string;
    state?: string;
    tier?: string;
};
type ProductRow = {
    sku: string;
    name: string;
    category: string;
    unit: string;
    price?: number;
    cost?: number;
    stock?: number;
    reorder_level?: number;
    hsn?: string;
    gst_percent?: number;
    status?: string;
};
export declare class ImportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    preview(tenantId: string, payload: ImportPreviewRequest): {
        entity: string;
        totalRows: number;
        validRows: number;
        invalidRows: number;
        errors: ImportError[];
        normalizedRows: ClientRow[];
    } | {
        entity: string;
        totalRows: number;
        validRows: number;
        invalidRows: number;
        errors: ImportError[];
        normalizedRows: ProductRow[];
    };
    commit(tenantId: string, payload: ImportCommitRequest): Promise<{
        entity: string;
        totalRows: number;
        created: number;
        updated: number;
        errors: ImportError[];
    }>;
    private previewClients;
    private previewProducts;
    private commitClients;
    private commitProducts;
    private normalizeClientRow;
    private normalizeProductRow;
    private pickValue;
    private pickNumber;
    private normalizeRowKeys;
    private normalizeHeader;
    private normalizeClientType;
    private normalizeClientTier;
    private normalizeStatus;
    private isValidEmail;
    private resolveCategoryId;
}
export {};
