import { PrismaService } from '../prisma.service';
export declare class ProductsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string, query: {
        search?: string;
        category?: string;
        status?: string;
    }): Promise<({
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
        price: number;
        cost: number;
        stock: number;
        reorder_level: number;
        hsn: string | null;
        gst_percent: number;
        description: string | null;
        image_url: string | null;
    })[]>;
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
        price: number;
        cost: number;
        stock: number;
        reorder_level: number;
        hsn: string | null;
        gst_percent: number;
        description: string | null;
        image_url: string | null;
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
        price: number;
        cost: number;
        stock: number;
        reorder_level: number;
        hsn: string | null;
        gst_percent: number;
        description: string | null;
        image_url: string | null;
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
        price: number;
        cost: number;
        stock: number;
        reorder_level: number;
        hsn: string | null;
        gst_percent: number;
        description: string | null;
        image_url: string | null;
    }>;
    remove(id: string, tenantId: string): Promise<{
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
        price: number;
        cost: number;
        stock: number;
        reorder_level: number;
        hsn: string | null;
        gst_percent: number;
        description: string | null;
        image_url: string | null;
    }>;
    exportCsv(tenantId: string, query: {
        search?: string;
        category?: string;
        status?: string;
    }): Promise<string>;
}
