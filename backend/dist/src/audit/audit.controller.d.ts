import { AuditService } from './audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    findAll(user: AuthenticatedUser, page?: string, pageSize?: string): Promise<import("../common/utils/pagination.util").PaginatedResult<any>>;
    findByEntity(entityType: string, entityId: string, user: AuthenticatedUser): Promise<({
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
        before_json: string | null;
        after_json: string | null;
    })[]>;
}
