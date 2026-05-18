import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { PaginationParams, PaginatedResult } from '../common/utils/pagination.util';
export declare class ProductsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string, params: PaginationParams & {
        category?: string;
        status?: string;
    }): Promise<PaginatedResult<any>>;
    getCategories(tenantId: string): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
    }[]>;
    findOne(id: string, tenantId: string): Promise<{
        category: {
            name: string;
            id: string;
            created_at: Date;
            updated_at: Date;
            tenant_id: string;
        };
    } & {
        name: string;
        unit: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        status: string;
        sku: string;
        category_id: string;
        price: Prisma.Decimal;
        cost: Prisma.Decimal;
        stock: number;
        reorder_level: number;
        hsn: string | null;
        gst_percent: Prisma.Decimal;
        description: string | null;
        image_url: string | null;
        deleted_at: Date | null;
    }>;
    create(tenantId: string, body: {
        sku: string;
        name: string;
        category_id: string;
        unit: string;
        price: number;
        cost: number;
        stock?: number;
        reorder_level?: number;
        hsn?: string;
        gst_percent?: number;
        description?: string;
        status?: string;
        image_url?: string;
    }): Promise<{
        category: {
            name: string;
            id: string;
            created_at: Date;
            updated_at: Date;
            tenant_id: string;
        };
    } & {
        name: string;
        unit: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        status: string;
        sku: string;
        category_id: string;
        price: Prisma.Decimal;
        cost: Prisma.Decimal;
        stock: number;
        reorder_level: number;
        hsn: string | null;
        gst_percent: Prisma.Decimal;
        description: string | null;
        image_url: string | null;
        deleted_at: Date | null;
    }>;
    update(id: string, tenantId: string, body: Partial<{
        sku: string;
        name: string;
        category_id: string;
        unit: string;
        price: number;
        cost: number;
        stock: number;
        reorder_level: number;
        hsn: string;
        gst_percent: number;
        description: string;
        status: string;
        image_url: string;
    }>): Promise<{
        category: {
            name: string;
            id: string;
            created_at: Date;
            updated_at: Date;
            tenant_id: string;
        };
    } & {
        name: string;
        unit: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        status: string;
        sku: string;
        category_id: string;
        price: Prisma.Decimal;
        cost: Prisma.Decimal;
        stock: number;
        reorder_level: number;
        hsn: string | null;
        gst_percent: Prisma.Decimal;
        description: string | null;
        image_url: string | null;
        deleted_at: Date | null;
    }>;
    remove(id: string, tenantId: string): Promise<{
        message: string;
    }>;
    forceDelete(id: string, tenantId: string): Promise<{
        message: string;
    }>;
    uploadImage(id: string, tenantId: string, imageUrl: string): Promise<{
        category: {
            name: string;
            id: string;
            created_at: Date;
            updated_at: Date;
            tenant_id: string;
        };
    } & {
        name: string;
        unit: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        status: string;
        sku: string;
        category_id: string;
        price: Prisma.Decimal;
        cost: Prisma.Decimal;
        stock: number;
        reorder_level: number;
        hsn: string | null;
        gst_percent: Prisma.Decimal;
        description: string | null;
        image_url: string | null;
        deleted_at: Date | null;
    }>;
    exportCsv(tenantId: string, query: {
        search?: string;
        category?: string;
        status?: string;
    }): Promise<string>;
}
