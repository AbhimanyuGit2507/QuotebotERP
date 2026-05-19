import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { requireEnv } from '../common/utils/env.util';

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
      secretOrKey: requireEnv('JWT_SECRET'),
    });
  }

  /**
   * Passport JWT Strategy validation
   * Called automatically when a request includes a Bearer token
   * Returns the user object with both user-level and role-level permissions
   */
  async validate(payload: JwtPayload) {
    const user = await this.authService.validateToken(payload);

    // Parse role-level permissions from Role.permissions_json
    let rolePermissions: string[] = [];
    try {
      if (user.role?.permissions_json) {
        const parsed: unknown =
          typeof user.role.permissions_json === 'string'
            ? JSON.parse(user.role.permissions_json)
            : user.role.permissions_json;
        if (Array.isArray(parsed)) rolePermissions = parsed as string[];
      }
    } catch {
      rolePermissions = [];
    }

    // Parse user-level permissions (handle both array and object formats)
    let userPermissions: string[] = [];
    try {
      if ((user as Record<string, unknown>).permissions) {
        const raw = (user as Record<string, unknown>).permissions;
        const parsed: unknown =
          typeof raw === 'string' ? JSON.parse(raw) : raw;
        // If permissions is an object with 'granular' key, extract the array
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const obj = parsed as Record<string, unknown>;
          if (Array.isArray(obj.granular)) userPermissions = obj.granular as string[];
        } else if (Array.isArray(parsed)) {
          userPermissions = parsed as string[];
        }
      }
    } catch {
      userPermissions = [];
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenant_id: user.tenant_id,
      role: user.role.name,
      permissions: userPermissions,
      role_permissions: rolePermissions,
    };
  }
}
