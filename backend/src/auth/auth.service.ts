import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { requireEnv } from '../common/utils/env.util';

interface GoogleOAuthState {
  redirectTo?: string;
  source?: 'login' | 'signup';
  timestamp: number;
}

interface GoogleUserInfo {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    tenant_id: string;
    role: string;
    company_name?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Login user with email and password
   * Returns JWT token if credentials are valid
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        tenant: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Register a new user
   * Only accessible to admins for tenant creation
   */
  async register(registerDto: RegisterDto) {
    const { tenant_id, email, name, password } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenant_id },
    });

    if (!tenant) {
      throw new BadRequestException('Invalid tenant ID');
    }

    if (!tenant.allow_public_registration) {
      throw new BadRequestException('Public registration is disabled for this tenant');
    }

    const userRole = await this.prisma.role.findUnique({
      where: { name: 'user' },
    });

    if (!userRole) {
      throw new BadRequestException('Default user role not found');
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        tenant_id,
        email,
        name,
        password_hash,
        role_id: userRole.id,
        status: 'active',
      },
      include: {
        role: true,
        tenant: true,
      },
    });

    return this.buildAuthResponse(newUser);
  }

  getGoogleOAuthUrl(redirectTo?: string, source: 'login' | 'signup' = 'login') {
    const { clientId, redirectUri } = this.resolveGoogleOAuthCredentials();

    const state: GoogleOAuthState = {
      redirectTo,
      source,
      timestamp: Date.now(),
    };

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: ['openid', 'email', 'profile'].join(' '),
      state: Buffer.from(JSON.stringify(state)).toString('base64url'),
      access_type: 'offline',
      prompt: 'consent select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleOAuthCallback(code: string, state: string) {
    const { redirectTo } = this.decodeGoogleOAuthState(state);
    const { clientId, clientSecret, redirectUri } =
      this.resolveGoogleOAuthCredentials();

    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody,
    });

    const tokenPayload: unknown = await tokenResponse.json();

    if (!tokenResponse.ok) {
      const errorMessage =
        typeof tokenPayload === 'object' && tokenPayload !== null
          ? JSON.stringify(tokenPayload)
          : 'Unknown error';

      throw new BadRequestException(
        `Google token exchange failed (${tokenResponse.status}): ${errorMessage}`,
      );
    }

    if (!tokenPayload || typeof tokenPayload !== 'object') {
      throw new BadRequestException('Invalid Google token response');
    }

    const tokens = tokenPayload as Record<string, unknown>;
    const accessToken = tokens.access_token;

    if (typeof accessToken !== 'string' || !accessToken.trim()) {
      throw new BadRequestException('Missing Google access token');
    }

    const profileResponse = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const profilePayload: unknown = await profileResponse.json();

    if (!profileResponse.ok) {
      const errorMessage =
        typeof profilePayload === 'object' && profilePayload !== null
          ? JSON.stringify(profilePayload)
          : 'Unknown error';

      throw new BadRequestException(
        `Google profile lookup failed (${profileResponse.status}): ${errorMessage}`,
      );
    }

    if (!profilePayload || typeof profilePayload !== 'object') {
      throw new BadRequestException('Invalid Google profile response');
    }

    const profile = profilePayload as GoogleUserInfo;
    const email = profile.email?.trim().toLowerCase();
    const name = this.resolveGoogleDisplayName(profile);

    if (!email) {
      throw new BadRequestException('Google account email was not returned');
    }

    const user = await this.findOrCreateGoogleUser({
      email,
      name,
    });

    const session = this.buildAuthResponse(user);

    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenant_id: user.tenant_id,
        role: user.role.name,
        company_name: user.tenant.company_name,
      },
      redirectTo,
    };
  }

  async refreshSession(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);
    const user = await this.validateToken({
      sub: payload.sub,
      email: payload.email,
      tenant_id: payload.tenant_id,
      role: payload.role,
    });

    return this.buildAuthResponse(user);
  }

  /**
   * Validate JWT token and extract user info
   * Used by JWT Guard to verify requests
   */
  async validateToken(payload: {
    sub: string;
    email: string;
    tenant_id: string;
    role: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: true,
        tenant: true,
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  /**
   * Verify user credentials (used by passport strategy if needed)
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        tenant: true,
      },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    tenant_id: string;
    role: { name: string };
    tenant: { company_name: string };
  }): AuthResponse {
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenant_id: user.tenant_id,
        role: user.role.name,
        company_name: user.tenant.company_name,
      },
    };
  }

  private signAccessToken(user: {
    id: string;
    email: string;
    tenant_id: string;
    role: { name: string };
  }) {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
        role: user.role.name,
      },
      {
        secret: this.getAccessSecret(),
        expiresIn: this.getAccessExpiration() as StringValue,
      },
    );
  }

  private signRefreshToken(user: {
    id: string;
    email: string;
    tenant_id: string;
    role: { name: string };
  }) {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
        role: user.role.name,
        token_type: 'refresh',
      },
      {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshExpiration() as StringValue,
      },
    );
  }

  private verifyRefreshToken(token: string) {
    try {
      const raw = this.jwtService.verify(token, {
        secret: this.getRefreshSecret(),
      }) as Record<string, unknown> | null;

      if (!raw || raw.token_type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const sub = typeof raw.sub === 'string' ? raw.sub : undefined;
      const email = typeof raw.email === 'string' ? raw.email : undefined;
      const tenant_id =
        typeof raw.tenant_id === 'string' ? raw.tenant_id : undefined;
      const role = typeof raw.role === 'string' ? raw.role : undefined;

      if (!sub || !email || !tenant_id || !role) {
        throw new UnauthorizedException('Invalid refresh token payload');
      }

      return {
        sub,
        email,
        tenant_id,
        role,
        token_type: raw.token_type as string,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private getAccessSecret() {
    return process.env.JWT_SECRET || 'your-secret-key';
  }

  private getAccessExpiration() {
    return process.env.JWT_EXPIRATION || '24h';
  }

  private getRefreshSecret() {
    return process.env.JWT_REFRESH_SECRET || this.getAccessSecret();
  }

  private getRefreshExpiration() {
    return process.env.JWT_REFRESH_EXPIRATION || '14d';
  }

  private resolveGoogleOAuthCredentials() {
    const clientId =
      process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
    const clientSecret =
      process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      'http://localhost:3001/api/auth/google/callback';

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Google OAuth credentials are not configured',
      );
    }

    return { clientId, clientSecret, redirectUri };
  }

  private decodeGoogleOAuthState(state: string) {
    if (!state) {
      return { redirectTo: undefined };
    }

    try {
      const payload = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf8'),
      ) as Partial<GoogleOAuthState>;

      return {
        redirectTo:
          typeof payload.redirectTo === 'string'
            ? payload.redirectTo
            : undefined,
      };
    } catch {
      return { redirectTo: undefined };
    }
  }

  private resolveGoogleDisplayName(profile: GoogleUserInfo) {
    const candidate =
      profile.name?.trim() ||
      [profile.given_name, profile.family_name]
        .filter(Boolean)
        .join(' ')
        .trim();

    if (candidate) {
      return candidate;
    }

    return profile.email?.split('@')[0] ?? 'Google User';
  }

  private async findOrCreateGoogleUser({
    email,
    name,
  }: {
    email: string;
    name: string;
  }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        tenant: true,
      },
    });

    if (existingUser) {
      if (existingUser.status !== 'active') {
        throw new UnauthorizedException('User account is inactive');
      }

      return existingUser;
    }

    const userRole = await this.prisma.role.findUnique({
      where: { name: 'user' },
    });

    if (!userRole) {
      throw new BadRequestException('Default user role not found');
    }

    const tenantName = await this.createUniqueTenantName(name, email);
    const tenant = await this.prisma.tenant.create({
      data: {
        company_name: tenantName,
      },
    });

    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);

    return this.prisma.user.create({
      data: {
        tenant_id: tenant.id,
        email,
        name,
        password_hash: passwordHash,
        role_id: userRole.id,
        status: 'active',
      },
      include: {
        role: true,
        tenant: true,
      },
    });
  }

  private async createUniqueTenantName(name: string, email: string) {
    const baseLabel = this.slugToTitleCase(
      name || email.split('@')[0] || 'Google User',
    );
    let candidate = `${baseLabel} Workspace`;
    let suffix = 2;

    while (
      await this.prisma.tenant.findUnique({
        where: { company_name: candidate },
      })
    ) {
      candidate = `${baseLabel} Workspace ${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private slugToTitleCase(value: string) {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }
}
