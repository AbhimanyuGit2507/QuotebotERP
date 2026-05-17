import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Internal API Key Authentication Guard
 * Validates X-Internal-Key header against INTERNAL_API_KEY env variable
 *
 * Used to protect /api/internal/* endpoints from internal automation scripts
 *
 * Setup:
 * 1. Set INTERNAL_API_KEY env variable in .env
 * 2. Apply guard: @UseGuards(InternalKeyAuthGuard)
 * 3. Optionally extract tenant_id from header or query
 *
 * Internal scripts call endpoint with:
 *   X-Internal-Key: INTERNAL_API_KEY
 *   X-Tenant-ID: tenant_id_here (optional for tenant-agnostic endpoints)
 */
@Injectable()
export class InternalKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(InternalKeyAuthGuard.name);
  private readonly internalKey =
    process.env.INTERNAL_API_KEY || 'UNSET_INTERNAL_API_KEY';

  canActivate(context: ExecutionContext): boolean {
    if (this.internalKey === 'UNSET_INTERNAL_API_KEY') {
      this.logger.error(
        'INTERNAL_API_KEY is not configured. Internal endpoints are disabled until it is set.',
      );
      throw new UnauthorizedException(
        'Internal integration key is not configured',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-internal-key'] as string;

    // Validate key
    if (!providedKey || providedKey !== this.internalKey) {
      this.logger.warn(`Invalid X-Internal-Key attempt from ${request.ip}`);
      throw new UnauthorizedException('Invalid X-Internal-Key header');
    }

    // Extract tenant ID from header or query
    const tenantId =
      (request.headers['x-tenant-id'] as string) ||
      (request.query.tenant_id as string);

    if (tenantId) {
      // Attach tenant_id to request for use in controllers when provided.
      request['tenantId'] = tenantId;
    }

    return true;
  }
}
