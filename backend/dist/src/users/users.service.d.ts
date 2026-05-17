import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string): Promise<({
        role: {
            name: string;
            id: string;
            permissions_json: string;
            created_at: Date;
        };
    } & {
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        email: string;
        tenant_id: string;
        password_hash: string;
        role_id: string;
        status: string;
        permissions: Prisma.JsonValue | null;
    })[]>;
    findOne(id: string, tenantId: string): Promise<{
        role: {
            name: string;
            id: string;
            permissions_json: string;
            created_at: Date;
        };
    } & {
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        email: string;
        tenant_id: string;
        password_hash: string;
        role_id: string;
        status: string;
        permissions: Prisma.JsonValue | null;
    }>;
    private getRoleByName;
    create(tenantId: string, body: {
        email: string;
        name: string;
        password: string;
        role?: string;
        status?: string;
    }): Promise<{
        role: {
            name: string;
            id: string;
            permissions_json: string;
            created_at: Date;
        };
    } & {
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        email: string;
        tenant_id: string;
        password_hash: string;
        role_id: string;
        status: string;
        permissions: Prisma.JsonValue | null;
    }>;
    update(id: string, tenantId: string, body: Partial<{
        email: string;
        name: string;
        password: string;
        role: string;
        status: string;
        permissions: Record<string, unknown>;
    }>): Promise<{
        role: {
            name: string;
            id: string;
            permissions_json: string;
            created_at: Date;
        };
    } & {
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        email: string;
        tenant_id: string;
        password_hash: string;
        role_id: string;
        status: string;
        permissions: Prisma.JsonValue | null;
    }>;
    remove(id: string, tenantId: string): Promise<{
        message: string;
    }>;
}
