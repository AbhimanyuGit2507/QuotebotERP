import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class InternalOrJwtAuthGuard implements CanActivate {
  private readonly internalKey =
    process.env.INTERNAL_API_KEY || 'UNSET_INTERNAL_API_KEY';
  private readonly jwtAuthGuard = new JwtAuthGuard();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.internalKey === 'UNSET_INTERNAL_API_KEY') {
      const canActivate = await this.jwtAuthGuard.canActivate(context);
      return Boolean(canActivate);
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-internal-key'] as string | undefined;

    if (providedKey && providedKey === this.internalKey) {
      const tenantId =
        (request.headers['x-tenant-id'] as string | undefined) ||
        (request.query.tenant_id as string | undefined);

      if (!tenantId) {
        throw new UnauthorizedException(
          'Missing X-Tenant-ID header or tenant_id query param',
        );
      }

      // Populate request.user for @CurrentUser() compatibility.
      request.user = {
        id: 'internal-automation',
        email: 'internal@automation.local',
        name: 'Internal Automation Script',
        role: 'system',
        permissions: ['*'],
        tenant_id: tenantId,
      } as unknown as Request['user'];

      return true;
    }

    const canActivate = await this.jwtAuthGuard.canActivate(context);
    return Boolean(canActivate);
  }
}
