import { ActivitiesService } from './activities.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
export declare class ActivitiesController {
    private readonly activitiesService;
    constructor(activitiesService: ActivitiesService);
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
    })[]>;
}
