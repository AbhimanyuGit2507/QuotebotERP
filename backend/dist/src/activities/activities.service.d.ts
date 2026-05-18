import { PrismaService } from '../prisma.service';
import { PaginationParams, PaginatedResult } from '../common/utils/pagination.util';
export declare class ActivitiesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string, params?: PaginationParams): Promise<PaginatedResult<any>>;
    findByEntity(tenantId: string, entityType: string, entityId: string): Promise<({
        user: {
            name: string;
            id: string;
            created_at: Date;
            updated_at: Date;
            email: string;
            tenant_id: string;
            password_hash: string;
            role_id: string;
            status: string;
            permissions: import("@prisma/client/runtime/client").JsonValue | null;
        } | null;
    } & {
        id: string;
        created_at: Date;
        tenant_id: string;
        user_id: string | null;
        action: string;
        entity_type: string;
        entity_id: string;
    })[]>;
}
