import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WhatsAppProcessorService } from '../whatsapp-processor.service';
import { NormalisedWhatsAppMessage } from '../whatsapp.types';
import { WhatsAppAccount } from '@prisma/client';

@Injectable()
export class MetaWhatsAppService {
  private readonly logger = new Logger(MetaWhatsAppService.name);

  private get appId() {
    return process.env.META_WHATSAPP_APP_ID || '';
  }
  private get appSecret() {
    return process.env.META_WHATSAPP_APP_SECRET || '';
  }
  private get redirectUri() {
    return (
      process.env.META_WHATSAPP_REDIRECT_URI ||
      'http://localhost:3001/api/whatsapp/meta/callback'
    );
  }
  private get verifyToken() {
    return process.env.META_WHATSAPP_VERIFY_TOKEN || 'quotebot_verify';
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: WhatsAppProcessorService,
  ) {}

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: 'whatsapp_business_management,whatsapp_business_messaging',
      response_type: 'code',
    });
    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<{ access_token: string }> {
    const url =
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${this.appId}&client_secret=${this.appSecret}&code=${code}&redirect_uri=${encodeURIComponent(this.redirectUri)}`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Meta token exchange failed: ${await res.text()}`);
    const data = (await res.json()) as { access_token: string };

    // Exchange for long-lived token
    const longLivedUrl =
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${data.access_token}`;
    const longRes = await fetch(longLivedUrl);
    if (!longRes.ok) return data;
    return longRes.json() as Promise<{ access_token: string }>;
  }

  async sendMessage(
    account: WhatsAppAccount,
    to: string,
    body: string,
  ): Promise<void> {
    if (!account.meta_phone_number_id || !account.meta_access_token) {
      throw new Error('Meta account not fully configured');
    }

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${account.meta_phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${account.meta_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body },
        }),
      },
    );

    if (!res.ok) throw new Error(`Meta send failed: ${await res.text()}`);
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge;
    }
    return null;
  }

  async processWebhookPayload(payload: unknown): Promise<void> {
    const p = payload as {
      entry?: Array<{
        id?: string;
        changes?: Array<{
          value?: {
            phone_number_id?: string;
            messages?: Array<{
              id?: string;
              from?: string;
              text?: { body?: string };
              type?: string;
              timestamp?: string;
            }>;
          };
        }>;
      }>;
    };

    for (const entry of p.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value?.messages) continue;

        // Find account by phone_number_id
        const account = value.phone_number_id
          ? await this.prisma.whatsAppAccount.findFirst({
              where: {
                meta_phone_number_id: value.phone_number_id,
                is_active: true,
              },
            })
          : null;

        if (!account) continue;

        for (const msg of value.messages) {
          const body = msg.text?.body || '';
          if (!body) continue;

          const normalised: NormalisedWhatsAppMessage = {
            accountId: account.id,
            tenantId: account.tenant_id,
            externalId: msg.id,
            fromNumber: msg.from || '',
            body,
            direction: 'inbound',
            timestamp: msg.timestamp
              ? new Date(parseInt(msg.timestamp, 10) * 1000).toISOString()
              : new Date().toISOString(),
            rawPayload: msg,
          };

          await this.processor.process(normalised);
        }
      }
    }
  }
}
