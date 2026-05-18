import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { encryptToken, decryptToken } from '../utils/tokenCrypto';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma.service';
import { InboundEmailDto } from './dtos/inbound-email.dto';
import { OutboundEmailUpdateDto } from './dtos/outbound-email-update.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private prisma: PrismaService) {}

  private buildMimePart(headers: Record<string, string>, body: string): string {
    const headerLines = Object.entries(headers).map(
      ([key, value]) => `${key}: ${value}`,
    );

    return [...headerLines, '', body].join('\r\n');
  }

  private encodeMimeBase64(value: string | Buffer): string {
    const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
    return buffer
      .toString('base64')
      .replace(/(.{76})/g, '$1\r\n')
      .replace(/\r\n$/g, '');
  }

  private buildRawMimeMessage(data: {
    from: string;
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>;
  }) {
    const toHeader = data.to.join(', ');
    const ccHeader = data.cc && data.cc.length ? data.cc.join(', ') : undefined;

    if (!data.attachments || data.attachments.length === 0) {
      return this.buildMimePart(
        {
          From: data.from,
          To: toHeader,
          ...(ccHeader ? { Cc: ccHeader } : {}),
          Subject: data.subject,
          'MIME-Version': '1.0',
          'Content-Type': 'text/plain; charset=UTF-8',
        },
        data.body,
      );
    }

    const boundary = `quotebot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const parts = [
      `From: ${data.from}`,
      `To: ${toHeader}`,
      ...(ccHeader ? [`Cc: ${ccHeader}`] : []),
      `Subject: ${data.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      this.buildMimePart(
        {
          'Content-Type': 'text/plain; charset=UTF-8',
          'Content-Transfer-Encoding': '7bit',
        },
        data.body,
      ),
    ];

    for (const attachment of data.attachments) {
      parts.push(
        `--${boundary}`,
        this.buildMimePart(
          {
            'Content-Type': `${attachment.contentType || 'application/octet-stream'}; name="${attachment.filename}"`,
            'Content-Disposition': `attachment; filename="${attachment.filename}"`,
            'Content-Transfer-Encoding': 'base64',
          },
          this.encodeMimeBase64(attachment.content),
        ),
      );
    }

    parts.push(`--${boundary}--`, '');
    return parts.join('\r\n');
  }

  private async getOrCreateInboxPlaceholderClient(tenantId: string) {
    const placeholderEmail = `inbox-unqualified+${tenantId}@quotebot.local`;
    const existing = await this.prisma.client.findFirst({
      where: {
        tenant_id: tenantId,
        email: placeholderEmail,
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.client.create({
      data: {
        tenant_id: tenantId,
        name: 'Inbox Unqualified Sender',
        email: placeholderEmail,
        type: 'B2B',
        tier: 'regular',
      },
    });
  }

  private parseReceivedAt(receivedAt?: string): Date | null {
    if (typeof receivedAt !== 'string' || !receivedAt.trim()) {
      return null;
    }

    const parsed = new Date(receivedAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private getSyncStatusFilePath(tenantId?: string): string {
    const suffix = tenantId ? `-${tenantId}` : '';
    return (
      process.env.GMAIL_SYNC_STATUS_FILE ||
      path.resolve(process.cwd(), '.runlogs', `gmail-sync-status${suffix}.json`)
    );
  }

  private isStaleRunningSyncStatus(
    status: Record<string, unknown>,
    statusFile: string,
  ) {
    if (status.status !== 'running') {
      return false;
    }

    const startedAtValue = status.startedAt;
    const startedAt =
      typeof startedAtValue === 'string' ? new Date(startedAtValue) : null;
    const startedAtMs =
      startedAt && !Number.isNaN(startedAt.getTime())
        ? startedAt.getTime()
        : null;
    const fileAgeMs = fs.existsSync(statusFile)
      ? Date.now() - fs.statSync(statusFile).mtimeMs
      : Number.POSITIVE_INFINITY;

    const staleByStartedAt =
      startedAtMs !== null && Date.now() - startedAtMs > 2 * 60 * 60 * 1000;
    const staleByFileAge = fileAgeMs > 2 * 60 * 60 * 1000;

    return staleByStartedAt || staleByFileAge;
  }

  private buildIdleSyncStatus() {
    return {
      status: 'idle',
      phase: 'idle',
      progressPercent: 0,
      message: 'Idle',
      startedAt: null,
      endedAt: null,
      lastRunAt: null,
      accountsTotal: 0,
      accountsProcessed: 0,
      totalMessages: 0,
      processedMessages: 0,
      synced: 0,
      duplicates: 0,
      failed: 0,
      currentAccountId: null,
      error: null,
      user_error: null,
      technical_error: null,
    };
  }

  getGmailSyncStatus(tenantId: string) {
    const statusFile = this.getSyncStatusFilePath(tenantId);

    try {
      if (!fs.existsSync(statusFile)) {
        return this.buildIdleSyncStatus();
      }

      const raw = fs.readFileSync(statusFile, 'utf8');
      const parsed: unknown = JSON.parse(raw);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid sync status payload');
      }

      const status = parsed as Record<string, unknown>;

      if (this.isStaleRunningSyncStatus(status, statusFile)) {
        this.logger.warn(
          `Resetting stale Gmail sync status for tenant ${tenantId}`,
        );
        return {
          ...this.buildIdleSyncStatus(),
          message: 'Previous sync expired. Ready to start again.',
        };
      }

      return status;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'failed',
        error: `Could not read sync status: ${message}`,
      };
    }
  }

  triggerImmediateGmailSync(tenantId: string) {
    const currentStatus = this.getGmailSyncStatus(tenantId);
    if (currentStatus.status === 'running') {
      return {
        started: false,
        reason: 'Sync already in progress',
        status: currentStatus,
      };
    }

    const syncScriptPath = path.resolve(
      process.cwd(),
      'scripts',
      'sync-gmail.js',
    );

    const statusFile = this.getSyncStatusFilePath(tenantId);
    try {
      fs.mkdirSync(path.dirname(statusFile), { recursive: true });
      const initialStatus = {
        status: 'running',
        phase: 'queued',
        progressPercent: 1,
        message: 'Sync queued',
        pid: process.pid,
        tenantId,
        startedAt: new Date().toISOString(),
        endedAt: null,
        lastRunAt: null,
        accountsTotal: 0,
        accountsProcessed: 0,
        totalMessages: 0,
        processedMessages: 0,
        synced: 0,
        duplicates: 0,
        failed: 0,
        currentAccountId: null,
        error: null,
        user_error: null,
        technical_error: null,
      };
      fs.writeFileSync(
        statusFile,
        `${JSON.stringify(initialStatus, null, 2)}\n`,
        'utf8',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Could not initialize Gmail sync status for tenant ${tenantId}: ${message}`,
      );
    }

    const child = spawn('node', [syncScriptPath], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        SYNC_TENANT_ID: tenantId,
        GMAIL_SYNC_STATUS_FILE: statusFile,
      },
    });

    child.unref();

    return {
      started: true,
      reason: 'Sync started',
    };
  }

  async clearInboxData(tenantId: string) {
    const [messagesBefore, conversationsBefore] = await Promise.all([
      this.prisma.message.count({ where: { tenant_id: tenantId } }),
      this.prisma.conversation.count({ where: { tenant_id: tenantId } }),
    ]);

    // Delete child rows first, then parent rows to honor FK constraints.
    await this.prisma.message.deleteMany({ where: { tenant_id: tenantId } });
    await this.prisma.conversation.deleteMany({
      where: { tenant_id: tenantId },
    });

    const [messagesAfter, conversationsAfter] = await Promise.all([
      this.prisma.message.count({ where: { tenant_id: tenantId } }),
      this.prisma.conversation.count({ where: { tenant_id: tenantId } }),
    ]);

    return {
      cleared: true,
      tenantId,
      before: {
        messages: messagesBefore,
        conversations: conversationsBefore,
      },
      after: {
        messages: messagesAfter,
        conversations: conversationsAfter,
      },
    };
  }

  private readCredentials(
    credentials: unknown,
  ): Record<string, unknown> | null {
    if (!credentials || typeof credentials !== 'object') {
      return null;
    }

    return credentials as Record<string, unknown>;
  }

  async getActiveEmailAccounts(tenantId: string) {
    const accounts = await this.prisma.emailAccount.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
      },
      select: {
        id: true,
        tenant_id: true,
        credentials: true,
      },
      orderBy: [{ created_at: 'asc' }],
    });

    return accounts.map((account) => {
      const credentials = this.readCredentials(account.credentials);
      const accessToken = credentials?.access_token;
      const expiresAt = credentials?.expires_at;

      return {
        id: account.id,
        access_token:
          typeof accessToken === 'string' && accessToken.trim().length > 0
            ? accessToken
            : undefined,
        expires_at: typeof expiresAt === 'string' ? expiresAt : null,
      };
    });
  }

  async refreshEmailAccountAccessToken(accountId: string, tenantId: string) {
    const account = await this.prisma.emailAccount.findFirst({
      where: {
        id: accountId,
        is_active: true,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        provider: true,
        tenant_id: true,
        user_id: true,
        credentials: true,
      },
    });

    if (!account) {
      throw new BadRequestException(`Email account ${accountId} not found`);
    }

    if (account.provider !== 'gmail') {
      throw new BadRequestException(
        `Token refresh is currently supported only for gmail accounts`,
      );
    }

    const credentials = this.readCredentials(account.credentials);
    // support encrypted or plaintext refresh tokens
    const storedRefresh = credentials?.refresh_token as string | undefined;
    const refreshToken =
      typeof storedRefresh === 'string' && storedRefresh.trim()
        ? decryptToken(storedRefresh)
        : storedRefresh;

    if (typeof refreshToken !== 'string' || !refreshToken.trim()) {
      throw new BadRequestException(
        `Missing refresh_token for email account ${accountId}`,
      );
    }

    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET environment variables',
      );
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException(
        `Failed to refresh token for email account ${accountId}`,
      );
    }

    if (!response.ok) {
      const refreshPayload = payload as Record<string, unknown>;
      const providerError =
        typeof refreshPayload.error_description === 'string'
          ? refreshPayload.error_description
          : typeof refreshPayload.error === 'string'
            ? refreshPayload.error
            : 'Unknown provider error';

      // Non-recoverable errors: deactivate account and record an activity for admins
      const nonRecoverable =
        /invalid_grant|invalid_token|token_revoked|unauthorized/i.test(
          providerError,
        );

      if (nonRecoverable) {
        try {
          await this.prisma.emailAccount.update({
            where: { id: accountId },
            data: { is_active: false, updated_at: new Date() },
          });
          await this.prisma.auditLog.create({
            data: {
              tenant_id: account.tenant_id,
              user_id: account.user_id,
              action: 'email_account_deactivated',
              entity_type: 'EmailAccount',
              entity_id: accountId,
              after_json: JSON.stringify({ reason: providerError }),
            },
          });
        } catch {
          // ignore logging errors
        }
      }

      throw new BadRequestException(
        `Failed to refresh token for email account ${accountId}: ${providerError}`,
      );
    }

    const refreshPayload = payload as Record<string, unknown>;
    const accessToken = refreshPayload.access_token;
    const expiresIn = refreshPayload.expires_in;

    if (typeof accessToken !== 'string' || !accessToken.trim()) {
      throw new BadRequestException(
        `Provider response did not include access_token for ${accountId}`,
      );
    }

    const nextCredentials: Record<string, unknown> = {
      ...(credentials || {}),
      access_token: accessToken,
      // If provider returned a new refresh token, encrypt it; otherwise preserve existing stored value
      refresh_token:
        typeof refreshPayload.refresh_token === 'string' &&
        refreshPayload.refresh_token.trim()
          ? encryptToken(String(refreshPayload.refresh_token))
          : credentials?.refresh_token,
      expires_at:
        typeof expiresIn === 'number' && Number.isFinite(expiresIn)
          ? new Date(Date.now() + expiresIn * 1000).toISOString()
          : null,
    };

    const updated = await this.prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        credentials: nextCredentials as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
      select: {
        id: true,
        credentials: true,
      },
    });

    const updatedCredentials = this.readCredentials(updated.credentials);

    return {
      id: updated.id,
      access_token: updatedCredentials?.access_token,
      expires_at: updatedCredentials?.expires_at ?? null,
    };
  }

  /**
   * Generate Google OAuth authorization URL
   * User clicks this link to authorize email access
   * Redirects back to /api/email-integrations/oauth/callback
   */
  initiateGoogleOAuth(state: string): string {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const redirectUri = process.env.GMAIL_REDIRECT_URI;

    this.logger.log(
      `initiateGoogleOAuth called hasClientId=${Boolean(clientId)} redirectUri=${redirectUri} stateLength=${state?.length ?? 0}`,
    );

    if (!clientId || !redirectUri) {
      throw new BadRequestException(
        'Missing GMAIL_CLIENT_ID or GMAIL_REDIRECT_URI environment variables',
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
      ].join(' '),
      state: state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Handle OAuth callback from Google
   * Exchanges authorization code for access & refresh tokens
   * Creates or updates EmailAccount record
   */
  async handleGoogleOAuthCallback(
    code: string,
    state: string,
    tenantId: string,
    userId: string,
  ) {
    this.logger.log(
      `handleGoogleOAuthCallback called tenantId=${tenantId} userId=${userId} hasCode=${Boolean(code)} hasState=${Boolean(state)}`,
    );

    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        'OAuth environment variables not configured',
      );
    }

    // Exchange code for tokens
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
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
    this.logger.log(
      `Token exchange response ok=${tokenResponse.ok} status=${tokenResponse.status}`,
    );

    if (!tokenResponse.ok) {
      const errorMsg =
        typeof tokenPayload === 'object' && tokenPayload !== null
          ? JSON.stringify(tokenPayload)
          : 'Unknown error';
      throw new BadRequestException(
        `Token exchange failed (${tokenResponse.status}): ${errorMsg}`,
      );
    }

    if (!tokenPayload || typeof tokenPayload !== 'object') {
      throw new BadRequestException('Invalid token response from Google');
    }

    const tokens = tokenPayload as Record<string, unknown>;
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresIn = tokens.expires_in;

    if (typeof accessToken !== 'string' || !accessToken.trim()) {
      throw new BadRequestException('Invalid token response from Google OAuth');
    }

    // Get Gmail profile to extract email address
    const profileResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const profilePayload: unknown = await profileResponse.json();
    this.logger.log(
      `Profile fetch response ok=${profileResponse.ok} status=${profileResponse.status}`,
    );

    if (!profileResponse.ok) {
      const errorMsg =
        typeof profilePayload === 'object' && profilePayload !== null
          ? JSON.stringify(profilePayload)
          : 'Unknown error';
      throw new BadRequestException(
        `Failed to fetch Gmail profile (${profileResponse.status}): ${errorMsg}`,
      );
    }

    if (!profilePayload || typeof profilePayload !== 'object') {
      throw new BadRequestException('Invalid profile response from Google');
    }

    const profile = profilePayload as Record<string, unknown>;
    const emailAddress = profile.emailAddress;

    if (typeof emailAddress !== 'string' || !emailAddress.trim()) {
      throw new BadRequestException(
        'Could not extract email address from profile',
      );
    }

    const existingAccount = await this.prisma.emailAccount.findFirst({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        email_address: emailAddress.toLowerCase(),
      },
      select: {
        id: true,
        credentials: true,
      },
    });

    const existingCredentials = this.readCredentials(
      existingAccount?.credentials,
    );
    const existingRefreshTokenEncrypted = existingCredentials?.refresh_token as
      | string
      | undefined;
    const existingRefreshToken = existingRefreshTokenEncrypted
      ? decryptToken(existingRefreshTokenEncrypted)
      : undefined;

    const resolvedRefreshToken =
      typeof refreshToken === 'string' && refreshToken.trim()
        ? refreshToken
        : typeof existingRefreshToken === 'string' &&
            existingRefreshToken.trim()
          ? existingRefreshToken
          : null;

    if (!resolvedRefreshToken) {
      throw new BadRequestException(
        'Google did not return a refresh token. Please reconnect Gmail and accept the consent prompt.',
      );
    }

    // Create or update EmailAccount
    const credentials: Record<string, unknown> = {
      ...(existingCredentials || {}),
      access_token: accessToken,
      // store refresh token encrypted to reduce risk at rest
      refresh_token:
        typeof resolvedRefreshToken === 'string'
          ? encryptToken(resolvedRefreshToken)
          : resolvedRefreshToken,
      expires_at:
        typeof expiresIn === 'number' && Number.isFinite(expiresIn)
          ? new Date(Date.now() + expiresIn * 1000).toISOString()
          : null,
    };

    const emailAccount = await this.prisma.emailAccount.upsert({
      where: {
        tenant_id_user_id_email_address: {
          tenant_id: tenantId,
          user_id: userId,
          email_address: emailAddress.toLowerCase(),
        },
      },
      update: {
        credentials: credentials as Prisma.InputJsonValue,
        is_active: true,
        updated_at: new Date(),
      },
      create: {
        tenant_id: tenantId,
        user_id: userId,
        provider: 'gmail',
        email_address: emailAddress.toLowerCase(),
        credentials: credentials as Prisma.InputJsonValue,
        is_active: true,
      },
      select: {
        id: true,
        email_address: true,
        provider: true,
      },
    });

    this.logger.log(
      `Email account upserted id=${emailAccount.id} email=${emailAccount.email_address} provider=${emailAccount.provider} tenantId=${tenantId}`,
    );

    return emailAccount;
  }

  /**
   * List all email accounts for a user
   */
  async getUserEmailAccounts(tenantId: string, userId: string) {
    return this.prisma.emailAccount.findMany({
      where: {
        tenant_id: tenantId,
        user_id: userId,
      },
      select: {
        id: true,
        email_address: true,
        provider: true,
        is_active: true,
        created_at: true,
      },
      orderBy: [{ created_at: 'desc' }],
    });
  }

  /**
   * Disconnect an email account
   */
  async disconnectEmailAccount(
    accountId: string,
    tenantId: string,
    userId: string,
  ) {
    const account = await this.prisma.emailAccount.findFirst({
      where: {
        id: accountId,
        tenant_id: tenantId,
        user_id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!account) {
      throw new BadRequestException('Email account not found or unauthorized');
    }

    await this.prisma.emailAccount.delete({
      where: {
        id: account.id,
      },
    });

    return { success: true, id: accountId };
  }

  /**
   * Process inbound email from external provider (Gmail, SES, etc)
   *
   * Core responsibility:
   * - Deduplicate via (email_account_id, external_id)
   * - Create Message with direction=inbound, is_processed=false
   * - Create/link Conversation
   * - Auto-find or mark Client for later linking
   *
   * Idempotent: Safe to call multiple times with same external_id
   */
  async processInboundEmail(
    tenantId: string | undefined,
    dto: InboundEmailDto,
  ): Promise<{
    message: unknown;
    conversation: { id: string };
    client: { id: string };
    is_duplicate: boolean;
  }> {
    // Validate email account and resolve tenant when caller does not provide one.
    const emailAccount = await this.prisma.emailAccount.findFirst({
      where: {
        id: dto.email_account_id,
        ...(tenantId ? { tenant_id: tenantId } : {}),
        is_active: true,
      },
    });

    if (!emailAccount) {
      throw new BadRequestException(
        `Email account ${dto.email_account_id} not found or inactive`,
      );
    }

    const resolvedTenantId = emailAccount.tenant_id;

    // Check if message already exists (dedup)
    const existingMessage = await this.prisma.message.findFirst({
      where: {
        email_account_id: dto.email_account_id,
        external_id: dto.external_id,
      },
      include: {
        conversation: true,
      },
    });

    if (existingMessage) {
      const incomingReceivedAt = this.parseReceivedAt(dto.received_at);
      const needsCreatedAtUpgrade =
        incomingReceivedAt !== null &&
        Math.abs(
          existingMessage.created_at.getTime() - incomingReceivedAt.getTime(),
        ) > 1000;
      const existingPayload =
        existingMessage.raw_payload &&
        typeof existingMessage.raw_payload === 'object'
          ? (existingMessage.raw_payload as Record<string, unknown>)
          : {};
      const incomingPayload =
        dto.raw_payload && typeof dto.raw_payload === 'object'
          ? (dto.raw_payload as Record<string, unknown>)
          : {};

      const existingHtml =
        typeof existingPayload.body_html === 'string'
          ? existingPayload.body_html.trim()
          : '';
      const incomingHtml =
        typeof incomingPayload.body_html === 'string'
          ? incomingPayload.body_html.trim()
          : '';

      const needsBodyUpgrade =
        typeof dto.body === 'string' &&
        dto.body.trim().length > 0 &&
        dto.body !== existingMessage.body;
      const needsPayloadUpgrade = incomingHtml.length > 0 && !existingHtml;

      if (needsBodyUpgrade || needsPayloadUpgrade || needsCreatedAtUpgrade) {
        await this.prisma.message.update({
          where: { id: existingMessage.id },
          data: {
            ...(needsBodyUpgrade ? { body: dto.body } : {}),
            ...(needsCreatedAtUpgrade && incomingReceivedAt
              ? { created_at: incomingReceivedAt }
              : {}),
            ...(needsPayloadUpgrade
              ? {
                  raw_payload: {
                    ...existingPayload,
                    ...incomingPayload,
                  } as Prisma.InputJsonValue,
                  updated_at: new Date(),
                }
              : {}),
          },
        });

        const refreshed = await this.prisma.message.findFirst({
          where: { id: existingMessage.id },
          include: { conversation: true },
        });
        if (refreshed) {
          existingMessage.body = refreshed.body;
          existingMessage.raw_payload = refreshed.raw_payload;
        }
      }

      // Already processed; return existing message
      const conversation = existingMessage.conversation;
      const client = await this.prisma.client.findUnique({
        where: { id: conversation.client_id },
      });

      if (!client) {
        throw new BadRequestException(
          `Client ${conversation.client_id} not found for existing message`,
        );
      }

      return {
        message: existingMessage,
        conversation: { id: conversation.id },
        client: { id: client.id },
        is_duplicate: true,
      };
    }

    // Try to find client by email
    let client = await this.prisma.client.findFirst({
      where: {
        tenant_id: resolvedTenantId,
        email: dto.sender_email,
      },
    });

    // For non-RFQ inbox ingestion, avoid creating real clients for every sender.
    // Real clients are created during RFQ conversion when item matching succeeds.
    if (!client) {
      client = await this.getOrCreateInboxPlaceholderClient(resolvedTenantId);
    }

    // Find or create Conversation (by thread_id or subject+client)
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        tenant_id: resolvedTenantId,
        client_id: client.id,
        email_account_id: dto.email_account_id,
        thread_id: dto.thread_id || undefined,
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenant_id: resolvedTenantId,
          client_id: client.id,
          email_account_id: dto.email_account_id,
          subject: dto.subject,
          channel: 'email',
          thread_id: dto.thread_id,
          status: 'open',
          unread_count: 1,
          last_message_at: dto.received_at
            ? new Date(dto.received_at)
            : new Date(),
        },
      });
    }

    const parsedReceivedAt = this.parseReceivedAt(dto.received_at);

    let message: unknown;
    try {
      // Create Message
      message = await this.prisma.message.create({
        data: {
          tenant_id: resolvedTenantId,
          conversation_id: conversation.id,
          sender_email: dto.sender_email,
          sender_name: dto.sender_name || dto.sender_email,
          body: dto.body,
          channel: 'email',
          is_read: false,
          external_id: dto.external_id,
          email_account_id: dto.email_account_id,
          provider: dto.provider,
          thread_id: dto.thread_id,
          raw_payload: dto.raw_payload,
          is_processed: false,
          processing_status: 'pending',
          direction: 'inbound',
          ...(parsedReceivedAt ? { created_at: parsedReceivedAt } : {}),
        },
      });
    } catch (error) {
      // Race-safe dedup: if unique constraint fires, return existing record.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicateMessage = await this.prisma.message.findFirst({
          where: {
            email_account_id: dto.email_account_id,
            external_id: dto.external_id,
          },
          include: {
            conversation: true,
          },
        });

        if (duplicateMessage) {
          const existingPayload =
            duplicateMessage.raw_payload &&
            typeof duplicateMessage.raw_payload === 'object'
              ? (duplicateMessage.raw_payload as Record<string, unknown>)
              : {};
          const incomingPayload =
            dto.raw_payload && typeof dto.raw_payload === 'object'
              ? (dto.raw_payload as Record<string, unknown>)
              : {};

          const existingHtml =
            typeof existingPayload.body_html === 'string'
              ? existingPayload.body_html.trim()
              : '';
          const incomingHtml =
            typeof incomingPayload.body_html === 'string'
              ? incomingPayload.body_html.trim()
              : '';

          if (incomingHtml.length > 0 && !existingHtml) {
            await this.prisma.message.update({
              where: { id: duplicateMessage.id },
              data: {
                raw_payload: {
                  ...existingPayload,
                  ...incomingPayload,
                } as Prisma.InputJsonValue,
                updated_at: new Date(),
              },
            });
          }

          const duplicateClient = await this.prisma.client.findUnique({
            where: { id: duplicateMessage.conversation.client_id },
          });

          if (!duplicateClient) {
            throw new BadRequestException(
              `Client ${duplicateMessage.conversation.client_id} not found for duplicate message`,
            );
          }

          return {
            message: duplicateMessage,
            conversation: { id: duplicateMessage.conversation.id },
            client: { id: duplicateClient.id },
            is_duplicate: true,
          };
        }
      }

      throw error;
    }

    // Increment unread count
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        unread_count: { increment: 1 },
        last_message_at: dto.received_at
          ? new Date(dto.received_at)
          : new Date(),
      },
    });

    return {
      message,
      conversation: { id: conversation.id },
      client: { id: client.id },
      is_duplicate: false,
    };
  }

  /**
   * Fetch pending outbound emails
   * Internal scripts query GET /api/internal/email/outbound?status=pending
   * Processes them via Gmail/SES, reports back via PATCH endpoint
   */
  async getPendingOutboundEmails(tenantId?: string, limit = 100) {
    const emails = await this.prisma.outboundEmail.findMany({
      where: {
        ...(tenantId ? { tenant_id: tenantId } : {}),
        status: 'pending',
      },
      include: {
        email_account: true,
      },
      take: limit,
      orderBy: [{ created_at: 'asc' }],
    });

    const tokenByAccountId = new Map<string, string | undefined>();

    const isTokenExpired = (expiresAt: string | null | undefined) => {
      if (!expiresAt) {
        return true;
      }

      const expiry = Date.parse(expiresAt);
      if (Number.isNaN(expiry)) {
        return true;
      }

      // Refresh slightly before hard expiry to avoid mid-request failures.
      return expiry <= Date.now() + 60_000;
    };

    for (const email of emails) {
      if (tokenByAccountId.has(email.email_account_id)) {
        continue;
      }

      const credentials = this.readCredentials(email.email_account.credentials);
      const existingToken =
        typeof credentials?.access_token === 'string' &&
        credentials.access_token.trim().length > 0
          ? credentials.access_token
          : undefined;
      const expiresAt =
        typeof credentials?.expires_at === 'string'
          ? credentials.expires_at
          : undefined;

      let token = existingToken;

      if (
        email.email_account.provider === 'gmail' &&
        (!token || isTokenExpired(expiresAt))
      ) {
        try {
          const refreshed = await this.refreshEmailAccountAccessToken(
            email.email_account_id,
            email.tenant_id,
          );
          token =
            typeof refreshed.access_token === 'string'
              ? refreshed.access_token
              : token;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown refresh error';
          this.logger.error(
            `Failed to refresh access token for account ${email.email_account_id}: ${message}`,
          );
        }
      }

      tokenByAccountId.set(email.email_account_id, token);
    }

    return emails.map((email) => ({
      id: email.id,
      tenant_id: email.tenant_id,
      email_account_id: email.email_account_id,
      provider: email.email_account.provider,
      access_token: tokenByAccountId.get(email.email_account_id),
      to: email.to as string[],
      cc: email.cc ? (email.cc as string[]) : undefined,
      subject: email.subject,
      body: email.body,
      attempts: email.attempts,
    }));
  }

  /**
   * Update outbound email status after send attempt
   * Called by internal scripts via PATCH /api/internal/email/outbound/:id
   */
  async updateOutboundEmailStatus(
    tenantId: string | undefined,
    emailId: string,
    update: OutboundEmailUpdateDto,
  ) {
    // Verify email exists, and belongs to tenant when tenant context is provided.
    const email = await this.prisma.outboundEmail.findFirst({
      where: {
        id: emailId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
    });

    if (!email) {
      throw new BadRequestException(`OutboundEmail ${emailId} not found`);
    }

    const result = await this.prisma.outboundEmail.update({
      where: { id: emailId },
      data: {
        status: update.status,
        provider: update.provider,
        last_error: update.last_error,
        attempts: update.attempts ?? { increment: 1 },
        sent_at: update.status === 'sent' ? new Date() : undefined,
        updated_at: new Date(),
      },
    });

    return result;
  }

  /**
   * Create outbound email (triggered by quotation send, etc)
   * Called internally by quotations.service or similar
   * Keeps email_account_id to know which account to send from
   */
  async createOutboundEmail(
    tenantId: string,
    data: {
      email_account_id: string;
      to: string[];
      cc?: string[];
      subject: string;
      body: string;
    },
  ) {
    const email = await this.prisma.outboundEmail.create({
      data: {
        tenant_id: tenantId,
        email_account_id: data.email_account_id,
        to: data.to,
        cc: data.cc,
        subject: data.subject,
        body: data.body,
        status: 'pending',
      },
    });

    return email;
  }

  /**
   * Send an email immediately using the connected EmailAccount (gmail for now).
   * Creates an OutboundEmail log and attempts to send via provider API.
   */
  async sendNow(
    tenantId: string,
    data: {
      email_account_id: string;
      to: string[];
      cc?: string[];
      subject: string;
      body: string;
      attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
      }>;
    },
  ) {
    this.logger.log(
      `sendNow called tenantId=${tenantId} emailAccountId=${data.email_account_id} to=${data.to?.join(',')} subject=${data.subject} attachments=${data.attachments?.length || 0}`,
    );

    const account = await this.prisma.emailAccount.findFirst({
      where: {
        id: data.email_account_id,
        tenant_id: tenantId,
        is_active: true,
      },
    });

    if (!account) {
      this.logger.error(
        `Email account not found emailAccountId=${data.email_account_id} tenantId=${tenantId}`,
      );
      throw new BadRequestException('Email account not found or not active');
    }

    this.logger.log(
      `Email account found id=${account.id} email=${account.email_address} provider=${account.provider}`,
    );

    if (account.provider !== 'gmail') {
      this.logger.error(`Unsupported provider: ${account.provider}`);
      throw new BadRequestException(
        'Immediate send is only supported for Gmail accounts',
      );
    }

    // Ensure tokens are fresh
    const credentials = this.readCredentials(account.credentials) || {};
    let accessToken =
      typeof credentials.access_token === 'string'
        ? credentials.access_token
        : undefined;

    const expiresAt =
      typeof credentials.expires_at === 'string'
        ? credentials.expires_at
        : undefined;
    const isExpired = (expires?: string | null) => {
      if (!expires) return true;
      const ts = Date.parse(expires);
      if (Number.isNaN(ts)) return true;
      return ts <= Date.now() + 60_000;
    };

    if (!accessToken || isExpired(expiresAt)) {
      this.logger.log('Access token expired or missing, refreshing...');
      try {
        const refreshed = await this.refreshEmailAccountAccessToken(
          account.id,
          tenantId,
        );
        accessToken = refreshed.access_token as string | undefined;
        this.logger.log('Access token refreshed successfully');
      } catch (err) {
        this.logger.error(
          `Failed to refresh access token: ${err instanceof Error ? err.message : String(err)} accountId=${account.id}`,
        );
        throw new BadRequestException('Could not refresh Gmail access token');
      }
    } else {
      this.logger.log('Using existing access token');
    }

    const fromAddress = account.email_address;

    const rawMessage = this.buildRawMimeMessage({
      from: fromAddress,
      to: data.to || [],
      cc: data.cc,
      subject: data.subject,
      body: data.body || '',
      attachments: data.attachments,
    });

    const encoded = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    // Attempt to send via Gmail API
    const sendUrl =
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

    this.logger.log(
      `Sending email via Gmail API to=${data.to?.join(',')} from=${fromAddress} messageSize=${rawMessage.length}`,
    );

    let sendResponse: unknown = null;
    try {
      sendResponse = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encoded }),
      });
    } catch (err) {
      this.logger.error(
        `Gmail send network error: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    }

    const sent = Boolean(
      sendResponse &&
      typeof sendResponse === 'object' &&
      'ok' in (sendResponse as Record<string, unknown>) &&
      (sendResponse as Record<string, unknown>)['ok'] === true,
    );

    let providerResult: Record<string, unknown> = {};
    let responseStatus: number | undefined;
    let responseStatusText: string | undefined;

    if (sendResponse && typeof sendResponse === 'object') {
      responseStatus = (sendResponse as any).status;
      responseStatusText = (sendResponse as any).statusText;

      if (
        typeof (sendResponse as Record<string, unknown>)['json'] === 'function'
      ) {
        try {
          // call json with typed function to avoid unsafe-call lint errors
          const jsonFn = (
            sendResponse as unknown as {
              json: () => Promise<unknown>;
            }
          ).json;
          const parsed = await jsonFn();
          if (parsed && typeof parsed === 'object') {
            providerResult = parsed as Record<string, unknown>;
          }
        } catch (jsonErr) {
          this.logger.error(
            `Failed to parse Gmail API response: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`,
          );
          providerResult = {};
        }
      }
    }

    const providerMessageId =
      providerResult && typeof (providerResult as any).id !== 'undefined'
        ? String((providerResult as any).id)
        : '';
    const safeResponseStatus =
      typeof responseStatus !== 'undefined' ? String(responseStatus) : '';
    const safeResponseStatusText =
      typeof responseStatusText !== 'undefined'
        ? String(responseStatusText)
        : '';

    this.logger.log(
      `Gmail API response sent=${String(sent)} status=${safeResponseStatus} statusText=${safeResponseStatusText} messageId=${providerMessageId}`,
    );

    // Log outbound email
    const outbound = await this.prisma.outboundEmail.create({
      data: {
        tenant_id: tenantId,
        email_account_id: account.id,
        to: data.to,
        cc: data.cc,
        subject: data.subject,
        body: data.body,
        status: sent ? 'sent' : 'failed',
        provider: 'gmail',
        last_error: sent ? undefined : JSON.stringify(providerResult || {}),
        sent_at: sent ? new Date() : undefined,
      },
    });

    if (!sent) {
      const errorMessage = `Failed to send email via Gmail: ${JSON.stringify(providerResult)}`;
      this.logger.error(
        `Email send failed outboundId=${outbound.id} status=${responseStatus} statusText=${responseStatusText}`,
      );
      throw new BadRequestException(errorMessage);
    }

    const safeToList = Array.isArray((data as any).to)
      ? (data as any).to.join(',')
      : String((data as any).to ?? '');
    this.logger.log(
      `✓ Email sent successfully outboundId=${outbound.id} messageId=${providerMessageId} to=${safeToList}`,
    );

    return {
      success: true,
      outbound_id: outbound.id,
      provider_response: providerResult,
    };
  }
}
