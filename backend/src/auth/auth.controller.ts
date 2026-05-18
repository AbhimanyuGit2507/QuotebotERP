import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  Res,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

type AuthRequest = Omit<Request, 'cookies'> & {
  cookies?: Record<string, string | undefined>;
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private static readonly accessCookieName = 'qb_access_token';
  private static readonly refreshCookieName = 'qb_refresh_token';

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.login(loginDto);
    this.setAuthCookies(res, session);
    return { user: session.user };
  }

  /**
   * POST /api/auth/register
   * Register a new user in an existing tenant
   */
  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.register(registerDto);
    this.setAuthCookies(res, session);
    return { user: session.user };
  }

  /**
   * GET /api/auth/google
   * Starts Google OAuth for platform sign-in / sign-up
   */
  @Get('google')
  googleAuth(
    @Query('redirectTo') redirectTo: string | undefined,
    @Query('source') source: 'login' | 'signup' | undefined,
    @Res() res: Response,
  ) {
    const authUrl = this.authService.getGoogleOAuthUrl(
      redirectTo,
      source ?? 'login',
    );

    return res.redirect(authUrl);
  }

  /**
   * GET /api/auth/google/callback
   * Google redirects here after authentication
   */
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      const result = await this.authService.handleGoogleOAuthCallback(
        code,
        state,
      );

      const redirectTarget = result.redirectTo || '/dashboard';
      this.setAuthCookies(res, result);
      const callbackUrl = new URL('/auth/callback', frontendUrl);
      callbackUrl.searchParams.set('redirectTo', redirectTarget);

      return res.redirect(callbackUrl.toString());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth error';
      const failureUrl = new URL('/login', frontendUrl);
      failureUrl.searchParams.set('error', message);

      return res.redirect(failureUrl.toString());
    }
  }

  /**
   * POST /api/auth/validate
   * Validate current JWT token (requires Bearer token)
   */
  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  validate() {
    return {
      message: 'Token is valid',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/auth/me
   * Returns authenticated user payload from JWT strategy
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      user,
    };
  }

  /**
   * POST /api/auth/refresh
   * Exchange refresh cookie for a new access token
   */
  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const refreshToken = cookies?.[AuthController.refreshCookieName];
    const refreshTokenValue =
      typeof refreshToken === 'string' ? refreshToken : undefined;

    if (!refreshTokenValue) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const session = await this.authService.refreshSession(refreshTokenValue);
    this.setAuthCookies(res, session);

    return { user: session.user };
  }

  /**
   * POST /api/auth/logout
   * Clears auth cookies
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearAuthCookies(res);

    return { message: 'Logged out' };
  }

  /**
   * GET /api/auth/admin-check
   * Example admin-only endpoint for upcoming protected modules
   */
  @Get('admin-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  adminCheck(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Admin access granted',
      user,
    };
  }

  private setAuthCookies(
    res: Response,
    session: { access_token: string; refresh_token: string },
  ) {
    res.cookie(
      AuthController.accessCookieName,
      session.access_token,
      this.getCookieOptions('access'),
    );
    res.cookie(
      AuthController.refreshCookieName,
      session.refresh_token,
      this.getCookieOptions('refresh'),
    );
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(
      AuthController.accessCookieName,
      this.getCookieOptions('access', true),
    );
    res.clearCookie(
      AuthController.refreshCookieName,
      this.getCookieOptions('refresh', true),
    );
  }

  private getCookieOptions(type: 'access' | 'refresh', omitMaxAge = false) {
    const baseMaxAge =
      type === 'access' ? 24 * 60 * 60 * 1000 : 14 * 24 * 60 * 60 * 1000;
    const duration =
      type === 'access'
        ? process.env.JWT_EXPIRATION || '24h'
        : process.env.JWT_REFRESH_EXPIRATION || '14d';
    const maxAge = this.parseDurationToMs(duration, baseMaxAge);
    const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
    const secureFlag =
      (process.env.AUTH_COOKIE_SECURE || '').toLowerCase() === 'true';
    const secure = secureFlag || process.env.NODE_ENV === 'production';
    const sameSite = (process.env.AUTH_COOKIE_SAMESITE || 'lax') as
      | 'lax'
      | 'strict'
      | 'none';

    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      ...(domain ? { domain } : {}),
      ...(omitMaxAge ? {} : { maxAge }),
    };
  }

  private parseDurationToMs(value: string, fallbackMs: number) {
    if (!value) {
      return fallbackMs;
    }

    if (/^\d+$/.test(value)) {
      return Number(value) * 1000;
    }

    const match = value.trim().match(/^(\d+)(ms|s|m|h|d)$/i);
    if (!match) {
      return fallbackMs;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'ms':
        return amount;
      case 's':
        return amount * 1000;
      case 'm':
        return amount * 60 * 1000;
      case 'h':
        return amount * 60 * 60 * 1000;
      case 'd':
        return amount * 24 * 60 * 60 * 1000;
      default:
        return fallbackMs;
    }
  }
}
