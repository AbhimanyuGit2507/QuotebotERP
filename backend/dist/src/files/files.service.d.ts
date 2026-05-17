import { PrismaService } from '../prisma.service';
export declare class FilesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string): Promise<{
        id: string;
        created_at: Date;
        tenant_id: string;
        filename: string;
        mime_type: string;
        size: number;
        storage_path: string;
    }[]>;
    findOne(id: string, tenantId: string): Promise<{
        id: string;
        created_at: Date;
        tenant_id: string;
        filename: string;
        mime_type: string;
        size: number;
        storage_path: string;
    }>;
    create(tenantId: string, body: {
        filename: string;
        mime_type: string;
        size: number;
        storage_path: string;
    }): Promise<{
        id: string;
        created_at: Date;
        tenant_id: string;
        filename: string;
        mime_type: string;
        size: number;
        storage_path: string;
    }>;
    remove(id: string, tenantId: string): Promise<{
        message: string;
    }>;
}
