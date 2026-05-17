import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(user: AuthenticatedUser): Promise<({
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
        permissions: import("@prisma/client/runtime/client").JsonValue | null;
    })[]>;
    findOne(id: string, user: AuthenticatedUser): Promise<{
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
        permissions: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    create(user: AuthenticatedUser, body: CreateUserDto): Promise<{
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
        permissions: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    update(id: string, user: AuthenticatedUser, body: UpdateUserDto): Promise<{
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
        permissions: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
}
