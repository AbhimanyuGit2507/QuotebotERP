import type { Response } from 'express';
import { ProductsService } from './products.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ProductsQueryDto } from './dtos/products-query.dto';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { UploadProductImageDto } from './dtos/upload-product-image.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(user: AuthenticatedUser, query: ProductsQueryDto): Promise<({
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
    exportCsv(user: AuthenticatedUser, query: ProductsQueryDto, res: Response): Promise<Response<any, Record<string, any>>>;
    getCategories(user: AuthenticatedUser): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
    }[]>;
    findOne(id: string, user: AuthenticatedUser): Promise<{
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
    create(user: AuthenticatedUser, body: CreateProductDto): Promise<{
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
    update(id: string, user: AuthenticatedUser, body: UpdateProductDto): Promise<{
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
    remove(id: string, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    uploadImage(id: string, user: AuthenticatedUser, body: UploadProductImageDto): Promise<{
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
}
