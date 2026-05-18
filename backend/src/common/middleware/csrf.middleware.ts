import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

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

    // Require X-Requested-With header on state-changing requests
    if (!req.headers['x-requested-with']) {
      throw new ForbiddenException('Missing X-Requested-With header');
    }

    next();
  }
}
