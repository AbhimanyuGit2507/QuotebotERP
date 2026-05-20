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
  Body,
  BadRequestException,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { EmailService } from './email.service';
import { OutlookService } from './outlook.service';
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

  constructor(
    private emailService: EmailService,
    private outlookService: OutlookService,
  ) {}

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

  // ─── Gmail Push Notification Webhook (no auth — called by Google Pub/Sub) ───

  /** POST /api/email-integrations/gmail/webhook */
  @Post('gmail/webhook')
  @HttpCode(200)
  async gmailWebhook(@Req() req: Request, @Res() res: Response) {
    try {
      const resourceState = req.headers['x-goog-resource-state'] as string;
      if (resourceState === 'sync') {
        res.sendStatus(200);
        return;
      }

      const body = req.body as Record<string, unknown>;
      if (body?.message) {
        const msgData = (body.message as Record<string, unknown>).data as string;
        if (msgData) {
          const decoded = JSON.parse(Buffer.from(msgData, 'base64').toString('utf8')) as {
            emailAddress?: string;
            historyId?: string;
          };
          if (decoded.emailAddress) {
            const account = await this.emailService['prisma'].emailAccount.findFirst({
              where: { email_address: decoded.emailAddress, is_active: true },
              select: { id: true },
            });
            if (account) {
              void this.emailService.syncGmailIncremental(account.id);
            }
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Gmail webhook error: ${(err as Error).message}`);
    }
    res.sendStatus(200);
  }

  /** POST /api/email-integrations/gmail/watch */
  @UseGuards(JwtAuthGuard)
  @Post('gmail/watch')
  async gmailWatch(@Req() req: Request & { user: AuthenticatedUser }) {
    const tenantId = req.user?.tenant_id;
    const topic = process.env.GMAIL_PUBSUB_TOPIC;
    if (!topic) {
      return { message: 'GMAIL_PUBSUB_TOPIC not configured — skipping watch setup' };
    }
    return this.emailService.setupGmailWatch(tenantId, topic);
  }

  // ─── Outlook OAuth ───

  /** GET /api/email-integrations/outlook/auth */
  @UseGuards(JwtAuthGuard)
  @Get('outlook/auth')
  async outlookAuth(@Req() req: Request & { user: AuthenticatedUser }) {
    const state = Buffer.from(JSON.stringify({ tenantId: req.user.tenant_id, userId: req.user.id })).toString('base64');
    return { url: this.outlookService.getAuthUrl(state) };
  }

  /** GET /api/email-integrations/outlook/callback */
  @Get('outlook/callback')
  async outlookCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const { tenantId, userId } = JSON.parse(Buffer.from(state, 'base64').toString('utf8')) as {
        tenantId: string;
        userId: string;
      };
      await this.outlookService.handleCallback(code, tenantId, userId);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/system-config?tab=email&connected=outlook`);
    } catch (err) {
      this.logger.error(`Outlook callback error: ${(err as Error).message}`);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/system-config?tab=email&error=outlook`);
    }
  }

  /** POST /api/email-integrations/outlook/webhook */
  @Post('outlook/webhook')
  @HttpCode(200)
  async outlookWebhook(@Query('validationToken') validationToken: string, @Req() req: Request, @Res() res: Response) {
    // Graph API validation handshake
    if (validationToken) {
      res.setHeader('Content-Type', 'text/plain');
      res.send(validationToken);
      return;
    }
    try {
      const body = req.body as Record<string, unknown>;
      await this.outlookService.processWebhookNotification(body);
    } catch (err) {
      this.logger.warn(`Outlook webhook error: ${(err as Error).message}`);
    }
    res.sendStatus(200);
  }

  /** DELETE /api/email-integrations/outlook/disconnect */
  @UseGuards(JwtAuthGuard)
  @Delete('outlook/disconnect')
  async outlookDisconnect(@Req() req: Request & { user: AuthenticatedUser }) {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    if (!tenantId || !userId) throw new BadRequestException('Missing user context');
    return this.outlookService.disconnect(tenantId, userId);
  }
}
