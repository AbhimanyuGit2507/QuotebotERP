import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

/**
 * Email Integrations Controller
 * User-facing endpoints for managing email account connections
 * Note: OAuth callback endpoint is public (called by Google)
 * Other endpoints require JWT authentication
 */
@SkipThrottle()
@Controller('email-integrations')
export class EmailIntegrationsController {
  private readonly logger = new Logger(EmailIntegrationsController.name);

  constructor(private emailService: EmailService) {}

  /**
   * GET /api/email-integrations
   * List all connected email accounts for the current user
   * Requires JWT authentication
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getEmailAccounts(@Req() req: Request & { user: AuthenticatedUser }) {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id;

    if (!userId || !tenantId) {
      throw new BadRequestException('User ID or Tenant ID not found');
    }

    return this.emailService.getUserEmailAccounts(tenantId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sync-status')
  getSyncStatus(@Req() req: Request & { user: AuthenticatedUser }) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found');
    }

    return this.emailService.getGmailSyncStatus(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync-now')
  triggerSyncNow(@Req() req: Request & { user: AuthenticatedUser }) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found');
    }

    return this.emailService.triggerImmediateGmailSync(tenantId, {
      syncMode: 'manual',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('clear-inbox')
  clearInbox(@Req() req: Request & { user: AuthenticatedUser }) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found');
    }

    return this.emailService.clearInboxData(tenantId);
  }

  /**
   * POST /api/email-integrations/oauth/authorize
   * Initiates Google OAuth flow
   * Returns redirect URL - frontend should use window.location.href to navigate
   * Requires JWT authentication
   */
  @UseGuards(JwtAuthGuard)
  @Post('oauth/authorize')
  authorizeOAuth(
    @Req() req: Request & { user: AuthenticatedUser },
    @Res() res: Response,
  ) {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id;

    this.logger.log(
      `OAuth authorize request received userId=${userId} tenantId=${tenantId}`,
    );

    if (!userId || !tenantId) {
      return res.status(400).json({
        error: 'User ID or Tenant ID not found',
      });
    }

    try {
      // Generate a state token (sign it with user/tenant info)
      const state = Buffer.from(
        JSON.stringify({ userId, tenantId, timestamp: Date.now() }),
      ).toString('base64');

      // Get OAuth authorization URL
      const authUrl = this.emailService.initiateGoogleOAuth(state);

      this.logger.log(
        `OAuth generated authorization URL successfully userId=${userId} tenantId=${tenantId}`,
      );

      // Return redirect URL
      return res.json({
        authorizationUrl: authUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth error';
      this.logger.error(
        `OAuth authorize request failed userId=${userId} tenantId=${tenantId} error=${message}`,
      );
      return res.status(500).json({ error: message });
    }
  }

  /**
   * GET /api/email-integrations/oauth/callback
   * Google redirects here after user authorizes
   * Query params: code, state
   *
   * Frontend should NOT call this directly; Google redirects here server-side
   */
  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log(
      `OAuth callback received hasCode=${Boolean(code)} hasState=${Boolean(state)}`,
    );

    if (!code || !state) {
      return res.status(400).json({
        error: 'Missing authorization code or state',
      });
    }

    try {
      // Decode state to extract user/tenant
      const statePayload = JSON.parse(
        Buffer.from(state, 'base64').toString(),
      ) as Record<string, unknown>;
      const userId = statePayload.userId as string;
      const tenantId = statePayload.tenantId as string;

      if (!userId || !tenantId) {
        this.logger.error('OAuth invalid callback state payload');
        return res.status(400).json({ error: 'Invalid state data' });
      }

      // Exchange code for tokens and create EmailAccount
      const emailAccount = await this.emailService.handleGoogleOAuthCallback(
        code,
        state,
        tenantId,
        userId,
      );

      this.logger.log(
        `OAuth callback completed and account linked userId=${userId} tenantId=${tenantId} email=${emailAccount.email_address}`,
      );

      try {
        const syncResult = this.emailService.triggerImmediateGmailSync(
          tenantId,
          {
            syncMode: 'initial',
          },
        );
        this.logger.log(
          `OAuth immediate sync trigger result tenantId=${tenantId} started=${syncResult.started} reason=${syncResult.reason}`,
        );
      } catch (syncError) {
        const syncMessage =
          syncError instanceof Error
            ? syncError.message
            : 'Unknown sync trigger error';
        this.logger.error(
          `OAuth failed to trigger immediate sync tenantId=${tenantId} error=${syncMessage}`,
        );
      }

      // Redirect to frontend with success message
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(
        `${frontendUrl}/system-config?tab=communication&success=email_connected&email=${encodeURIComponent(emailAccount.email_address)}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth error';
      this.logger.error(`OAuth callback failed error=${message}`);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(
        `${frontendUrl}/system-config?tab=communication&error=${encodeURIComponent(message)}`,
      );
    }
  }

  /**
   * DELETE /api/email-integrations/:id
   * Disconnect an email account
   * Requires JWT authentication
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async disconnectEmailAccount(
    @Param('id') accountId: string,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id;

    if (!userId || !tenantId) {
      throw new BadRequestException('User ID or Tenant ID not found');
    }

    return this.emailService.disconnectEmailAccount(
      accountId,
      tenantId,
      userId,
    );
  }
}
