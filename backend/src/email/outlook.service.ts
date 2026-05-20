import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailAccount } from '@prisma/client';

interface OutlookTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface OutlookMessage {
  id: string;
  subject?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  body?: { content?: string; contentType?: string };
  toRecipients?: Array<{ emailAddress?: { address?: string } }>;
}

interface DeltaResponse {
  value: OutlookMessage[];
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
}

@Injectable()
export class OutlookService {
  private readonly logger = new Logger(OutlookService.name);

  private get clientId() {
    return process.env.OUTLOOK_CLIENT_ID || '';
  }
  private get clientSecret() {
    return process.env.OUTLOOK_CLIENT_SECRET || '';
  }
  private get redirectUri() {
    return (
      process.env.OUTLOOK_REDIRECT_URI ||
      'http://localhost:3001/api/email-integrations/outlook/callback'
    );
  }
  private get tenant() {
    return process.env.OUTLOOK_TENANT || 'common';
  }

  constructor(private readonly prisma: PrismaService) {}

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'Mail.Read Mail.Send offline_access User.Read',
      state,
      response_mode: 'query',
    });
    return `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OutlookTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    });
    const res = await fetch(
      `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Outlook token exchange failed: ${err}`);
    }
    return res.json() as Promise<OutlookTokenResponse>;
  }

  async refreshToken(account: EmailAccount): Promise<string> {
    const creds = account.credentials as Record<string, string> | null;
    if (!creds?.refresh_token) throw new Error('No refresh token available');

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: creds.refresh_token,
      grant_type: 'refresh_token',
      scope: 'Mail.Read Mail.Send offline_access User.Read',
    });
    const res = await fetch(
      `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
    );
    if (!res.ok) throw new Error('Outlook token refresh failed');
    const data = (await res.json()) as OutlookTokenResponse;

    await this.prisma.emailAccount.update({
      where: { id: account.id },
      data: {
        credentials: {
          ...(creds as Record<string, unknown>),
          access_token: data.access_token,
          ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
        },
      },
    });
    return data.access_token;
  }

  async listNewMessages(
    account: EmailAccount,
    deltaLink?: string,
  ): Promise<{ messages: OutlookMessage[]; nextDeltaLink?: string }> {
    const creds = account.credentials as Record<string, string> | null;
    if (!creds?.access_token) return { messages: [] };

    let url =
      deltaLink ||
      'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$select=id,subject,from,receivedDateTime,body,toRecipients&$top=50';

    const messages: OutlookMessage[] = [];
    let finalDeltaLink: string | undefined;

    while (url) {
      let res = await fetch(url, {
        headers: { Authorization: `Bearer ${creds.access_token}` },
      });

      if (res.status === 401) {
        const newToken = await this.refreshToken(account);
        res = await fetch(url, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
      }

      if (!res.ok) break;
      const data = (await res.json()) as DeltaResponse;
      messages.push(...(data.value || []));

      if (data['@odata.deltaLink']) {
        finalDeltaLink = data['@odata.deltaLink'];
        break;
      }
      url = data['@odata.nextLink'] || '';
    }

    return { messages, nextDeltaLink: finalDeltaLink };
  }

  async sendMessage(
    account: EmailAccount,
    to: string[],
    subject: string,
    body: string,
  ): Promise<void> {
    const creds = account.credentials as Record<string, string> | null;
    if (!creds?.access_token) throw new Error('No access token');

    const message = {
      subject,
      body: { contentType: 'Text', content: body },
      toRecipients: to.map((email) => ({ emailAddress: { address: email } })),
    };

    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Outlook send failed: ${err}`);
    }
  }

  async subscribeWebhook(account: EmailAccount): Promise<void> {
    const creds = account.credentials as Record<string, string> | null;
    if (!creds?.access_token) return;

    const notificationUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/email-integrations/outlook/webhook`;
    const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

    const body = {
      changeType: 'created',
      notificationUrl,
      resource: "me/mailFolders('inbox')/messages",
      expirationDateTime: expiry.toISOString(),
      clientState: account.tenant_id,
    };

    const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      this.logger.warn(
        `Outlook webhook subscription failed: ${await res.text()}`,
      );
      return;
    }

    const data = (await res.json()) as { id: string };
    await this.prisma.emailAccount.update({
      where: { id: account.id },
      data: {
        outlook_subscription_id: data.id,
        outlook_subscription_expiry: expiry,
      },
    });
  }

  async handleCallback(
    code: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const tokens = await this.exchangeCode(code);

    // Get user profile from Graph
    const profileRes = await fetch(
      'https://graph.microsoft.com/v1.0/me?$select=mail,displayName',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );
    const profile = (await profileRes.json()) as {
      mail?: string;
      displayName?: string;
    };
    const emailAddress = profile.mail || '';

    if (!emailAddress)
      throw new Error('Could not get email address from Outlook profile');

    const existing = await this.prisma.emailAccount.findFirst({
      where: {
        tenant_id: tenantId,
        email_address: emailAddress,
        provider: 'outlook',
      },
    });

    const accountData = {
      credentials: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
        expires_at: new Date(
          Date.now() + tokens.expires_in * 1000,
        ).toISOString(),
      },
      is_active: true,
    };

    const account = existing
      ? await this.prisma.emailAccount.update({
          where: { id: existing.id },
          data: accountData,
        })
      : await this.prisma.emailAccount.create({
          data: {
            tenant_id: tenantId,
            user_id: userId,
            provider: 'outlook',
            email_address: emailAddress,
            ...accountData,
          },
        });

    // Subscribe to webhook if backend URL is configured
    if (process.env.BACKEND_URL) {
      await this.subscribeWebhook(account);
    }

    this.logger.log(
      `Outlook account connected: ${emailAddress} for tenant ${tenantId}`,
    );
  }

  async processWebhookNotification(
    body: Record<string, unknown>,
  ): Promise<void> {
    const value = body.value as Array<{
      clientState?: string;
      resourceData?: { id?: string };
    }>;
    if (!Array.isArray(value)) return;

    for (const notification of value) {
      const tenantId = notification.clientState;
      if (!tenantId) continue;

      const accounts = await this.prisma.emailAccount.findMany({
        where: { tenant_id: tenantId, provider: 'outlook', is_active: true },
        select: { id: true },
      });

      for (const account of accounts) {
        const { messages, nextDeltaLink } = await this.listNewMessages({
          id: account.id,
        } as EmailAccount);
        if (nextDeltaLink) {
          await this.prisma.emailAccount.update({
            where: { id: account.id },
            data: { outlook_delta_link: nextDeltaLink },
          });
        }
        this.logger.log(
          `Outlook webhook: ${messages.length} new messages for tenant ${tenantId}`,
        );
        // TODO: feed messages into AI pipeline via EmailRfqService
      }
    }
  }

  async disconnect(
    tenantId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    await this.prisma.emailAccount.deleteMany({
      where: { tenant_id: tenantId, user_id: userId, provider: 'outlook' },
    });
    return { success: true };
  }
}
