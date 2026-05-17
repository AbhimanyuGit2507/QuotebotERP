import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ImportsService } from './imports.service';
type ImportEntity = 'clients' | 'products';
interface ImportPreviewRequest {
    entity: ImportEntity;
    rows: Array<Record<string, unknown>>;
}
interface ImportCommitRequest {
    entity: ImportEntity;
    rows: Array<Record<string, unknown>>;
}
export declare class ImportsController {
    private readonly importsService;
    constructor(importsService: ImportsService);
    preview(user: AuthenticatedUser, body: ImportPreviewRequest): {
        entity: string;
        totalRows: number;
        validRows: number;
        invalidRows: number;
        errors: {
            rowIndex: number;
            messages: string[];
        }[];
        normalizedRows: {
            name: string;
            email: string;
            type?: string;
            phone?: string;
            gst?: string;
            address?: string;
            city?: string;
            state?: string;
            tier?: string;
        }[];
    } | {
        entity: string;
        totalRows: number;
        validRows: number;
        invalidRows: number;
        errors: {
            rowIndex: number;
            messages: string[];
        }[];
        normalizedRows: {
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
        }[];
    };
    commit(user: AuthenticatedUser, body: ImportCommitRequest): Promise<{
        entity: string;
        totalRows: number;
        created: number;
        updated: number;
        errors: {
            rowIndex: number;
            messages: string[];
        }[];
    }>;
}
export {};
