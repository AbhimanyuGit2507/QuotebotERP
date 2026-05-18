import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Paths that are exempt from the X-Requested-With CSRF check.
 * These are typically OAuth callbacks (initiated by external providers),
 * webhook endpoints, or Swagger UI requests.
 */
const EXCLUDED_PATHS = [
  '/email-integrations/oauth/callback',
  '/auth/google/callback',
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
];

/**
 * Path prefixes that are exempt from the CSRF check.
 */
const EXCLUDED_PREFIXES = ['/swagger', '/api-docs', '/docs'];

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Skip safe methods
    if (SAFE_METHODS.includes(req.method)) {
      return next();
    }

    // Skip if request uses internal API key (server-to-server calls)
    if (req.headers['x-internal-key']) {
      return next();
    }

    // Skip excluded paths (OAuth callbacks, webhooks, etc.)
    const path = req.baseUrl + req.path;
    // Normalize: strip the /api prefix if present so comparisons work
    const normalizedPath = path.replace(/^\/api/, '');

    if (EXCLUDED_PATHS.some((p) => normalizedPath === p)) {
      return next();
    }

    if (EXCLUDED_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
      return next();
    }

    // Require X-Requested-With header on state-changing requests
    if (!req.headers['x-requested-with']) {
      throw new ForbiddenException('Missing X-Requested-With header');
    }

    next();
  }
}
