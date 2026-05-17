import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { AuthService } from './auth.service';

interface JwtPayload {
  sub: string;
  email: string;
  tenant_id: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    const cookieExtractor = (req: Request | undefined): string | null => {
      if (!req?.cookies) {
        return null;
      }

      return typeof req.cookies.qb_access_token === 'string'
        ? req.cookies.qb_access_token
        : null;
    };

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  /**
   * Passport JWT Strategy validation
   * Called automatically when a request includes a Bearer token
   * Returns the user object if token is valid
   */
  async validate(payload: JwtPayload) {
    const user = await this.authService.validateToken(payload);
    let permissions: string[] = [];
    try {
      const parsed: unknown = JSON.parse(user.role.permissions_json);
      if (Array.isArray(parsed)) permissions = parsed as string[];
    } catch {
      permissions = [];
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenant_id: user.tenant_id,
      role: user.role.name,
      permissions,
    };
  }
}
