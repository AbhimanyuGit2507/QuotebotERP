import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Not authenticated');

    // Admin role has all permissions
    if (user.role === 'admin') return true;

    // Check user's permissions array
    const userPermissions: string[] = user.permissions || [];
    const rolePermissions: string[] = user.role_permissions || [];
    const allPermissions = [
      ...new Set([...userPermissions, ...rolePermissions]),
    ];

    const hasPermission = requiredPermissions.some((p) =>
      allPermissions.includes(p),
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permission: ${requiredPermissions.join(' or ')}`,
      );
    }
    return true;
  }
}
