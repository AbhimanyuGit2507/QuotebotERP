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
  private readonly internalKey = process.env.N8N_SECRET || 'UNSET_N8N_SECRET';
  private readonly jwtAuthGuard = new JwtAuthGuard();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.internalKey === 'UNSET_N8N_SECRET') {
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
        id: 'internal-n8n',
        email: 'internal@n8n.local',
        name: 'Internal n8n Worker',
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
