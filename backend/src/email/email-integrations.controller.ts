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
} from '@nestjs/common';
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
@Controller('email-integrations')
export class EmailIntegrationsController {
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

    return this.emailService.triggerImmediateGmailSync(tenantId);
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

    console.log('[Backend][OAuth] Authorize request received', {
      userId,
      tenantId,
      path: req.path,
      method: req.method,
    });

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

      console.log('[Backend][OAuth] Generated authorization URL successfully', {
        userId,
        tenantId,
      });

      // Return redirect URL
      return res.json({
        authorizationUrl: authUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth error';
      console.error('[Backend][OAuth] Authorize request failed', {
        userId,
        tenantId,
        error: message,
      });
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
    console.log('[Backend][OAuth] Callback received', {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      path: req.path,
      method: req.method,
    });

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
        console.error('[Backend][OAuth] Invalid callback state payload', {
          statePayload,
        });
        return res.status(400).json({ error: 'Invalid state data' });
      }

      // Exchange code for tokens and create EmailAccount
      const emailAccount = await this.emailService.handleGoogleOAuthCallback(
        code,
        state,
        tenantId,
        userId,
      );

      console.log('[Backend][OAuth] Callback completed and account linked', {
        userId,
        tenantId,
        email: emailAccount.email_address,
      });

      try {
        const syncResult =
          this.emailService.triggerImmediateGmailSync(tenantId);
        console.log('[Backend][OAuth] Immediate sync trigger result', {
          tenantId,
          started: syncResult.started,
          reason: syncResult.reason,
        });
      } catch (syncError) {
        const syncMessage =
          syncError instanceof Error
            ? syncError.message
            : 'Unknown sync trigger error';
        console.error('[Backend][OAuth] Failed to trigger immediate sync', {
          tenantId,
          error: syncMessage,
        });
      }

      // Redirect to frontend with success message
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(
        `${frontendUrl}/system-config?tab=communication&success=email_connected&email=${encodeURIComponent(emailAccount.email_address)}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth error';
      console.error('[Backend][OAuth] Callback failed', {
        error: message,
      });
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
