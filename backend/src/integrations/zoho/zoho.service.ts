/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma.service';
import { encryptToken, decryptToken } from '../../utils/tokenCrypto';

type ZohoIntegration = {
  id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: Date | string | null;
  tenant_external_id?: string | null;
};

@Injectable()
export class ZohoService {
  private readonly logger = new Logger(ZohoService.name);

  constructor(private readonly prisma: PrismaService) {}

  private normalizeExternalId(value: unknown): string {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }

    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value === null || value === undefined) {
      return Math.random().toString(36).slice(2);
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'bigint' ||
      typeof value === 'boolean'
    ) {
      return String(value).trim() || Math.random().toString(36).slice(2);
    }

    return JSON.stringify(value);
  }

  private normalizeSku(value: unknown): string {
    const normalized = this.normalizeExternalId(value);
    return normalized || 'unknown-sku';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private getString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  private getNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private encodeState(data: Record<string, string>) {
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  private decodeState(value?: string) {
    if (!value) return null;
    try {
      return JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as Record<string, string>;
    } catch {
      return null;
    }
  }

  getAuthorizationUrl(tenantId?: string, userId?: string) {
    const base =
      process.env.ZOHO_REGION === 'in'
        ? 'https://accounts.zoho.in'
        : 'https://accounts.zoho.com';
    const clientId = process.env.ZOHO_CLIENT_ID || '';
    const redirect = encodeURIComponent(process.env.ZOHO_REDIRECT_URI || '');
    const scope = encodeURIComponent(
      process.env.ZOHO_SCOPE || 'ZohoBooks.fullaccess.ALL',
    );
    const state = tenantId
      ? this.encodeState({ tenantId, userId: userId || '' })
      : undefined;
    const url = new URL(`${base}/oauth/v2/auth`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('scope', decodeURIComponent(scope));
    url.searchParams.set('redirect_uri', decodeURIComponent(redirect));
    if (state) url.searchParams.set('state', state);
    return { authorizationUrl: url.toString() };
  }

  async handleCallback(code: string, state?: string) {
    const payload = this.decodeState(state);
    const tenantId = payload?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Missing tenant in OAuth state');
    }
    return this.exchangeCode(code, tenantId);
  }

  async exchangeCode(code: string, tenantId?: string) {
    this.logger.log(
      'exchangeCode called with code=' + code + ' tenant=' + tenantId,
    );
    const base =
      process.env.ZOHO_REGION === 'in'
        ? 'https://accounts.zoho.in'
        : 'https://accounts.zoho.com';
    const tokenUrl = `${base}/oauth/v2/token`;

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', process.env.ZOHO_CLIENT_ID || '');
    params.append('client_secret', process.env.ZOHO_CLIENT_SECRET || '');
    params.append('redirect_uri', process.env.ZOHO_REDIRECT_URI || '');
    params.append('code', code);

    try {
      const resp = await axios.post(tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      });
      const data = resp.data as Record<string, unknown>;

      if (tenantId) {
        const expiresIn = this.getNumber(data.expires_in);
        const accessToken = this.getString(data.access_token);
        const refreshToken = this.getString(data.refresh_token);
        const scope = this.getString(data.scope);
        const expiresAt = expiresIn
          ? new Date(Date.now() + expiresIn * 1000)
          : null;

        if (!accessToken) {
          throw new BadRequestException('Zoho did not return an access token');
        }

        await this.prisma.accountingIntegration.upsert({
          where: {
            tenant_id_provider: { tenant_id: tenantId, provider: 'zoho' },
          },
          create: {
            tenant_id: tenantId,
            provider: 'zoho',
            access_token: accessToken,
            refresh_token: refreshToken ? encryptToken(refreshToken) : null,
            expires_at: expiresAt,
            scope,
            status: 'connected',
          },
          update: {
            access_token: accessToken,
            refresh_token: refreshToken
              ? encryptToken(refreshToken)
              : undefined,
            expires_at: expiresAt,
            scope,
            status: 'connected',
          },
        });
      }

      return { ok: true, data };
    } catch (err) {
      this.logger.error('Zoho token exchange failed', err);
      return { ok: false, error: String(err) };
    }
  }

  private zohoApiDomain() {
    // Default API domain; allow override via env
    if (process.env.ZOHO_API_DOMAIN) return process.env.ZOHO_API_DOMAIN;
    return process.env.ZOHO_REGION === 'in'
      ? 'https://www.zohoapis.in'
      : 'https://www.zohoapis.com';
  }

  private async refreshAccessTokenIfNeeded(
    integration: ZohoIntegration | null,
  ) {
    if (!integration) return integration;
    if (!integration.expires_at) return integration;
    const expiresAt = new Date(integration.expires_at);
    // Refresh if token expires within next 2 minutes
    if (expiresAt.getTime() - Date.now() < 2 * 60 * 1000) {
      const tokenUrl = `${process.env.ZOHO_REGION === 'in' ? 'https://accounts.zoho.in' : 'https://accounts.zoho.com'}/oauth/v2/token`;
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', process.env.ZOHO_CLIENT_ID || '');
      params.append('client_secret', process.env.ZOHO_CLIENT_SECRET || '');
      params.append(
        'refresh_token',
        decryptToken(integration.refresh_token) || '',
      );

      try {
        const resp = await axios.post(tokenUrl, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        });
        const data = resp.data;
        const newExpires = data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : null;
        integration = await this.prisma.accountingIntegration.update({
          where: { id: integration.id },
          data: {
            access_token: data.access_token,
            refresh_token: data.refresh_token || integration.refresh_token,
            expires_at: newExpires,
          },
        });
      } catch (err) {
        this.logger.error('Zoho refresh failed', err);
      }
    }
    return integration;
  }

  private async getIntegrationForTenant(tenantId: string) {
    if (!tenantId) throw new BadRequestException('Missing tenant id');
    const integration = await this.prisma.accountingIntegration.findFirst({
      where: { tenant_id: tenantId, provider: 'zoho', status: 'connected' },
    });
    if (!integration)
      throw new BadRequestException('Zoho integration not connected');
    const refreshed = await this.refreshAccessTokenIfNeeded(integration);
    if (!refreshed) {
      throw new BadRequestException('Zoho integration not connected');
    }
    return refreshed;
  }

  async listCustomers(tenantId: string) {
    const integration = await this.getIntegrationForTenant(tenantId);
    const apiDomain = this.zohoApiDomain();
    const orgId =
      process.env.ZOHO_ORG_ID || integration.tenant_external_id || '';
    const url =
      `${apiDomain}/books/v3/contacts` +
      (orgId ? `?organization_id=${orgId}` : '');
    try {
      const resp = await axios.get(url, {
        headers: {
          Authorization: `Zoho-oauthtoken ${integration.access_token}`,
        },
        timeout: 10000,
      });
      return { ok: true, data: resp.data };
    } catch (err) {
      this.logger.error('Zoho listCustomers failed', err);
      return { ok: false, error: String(err) };
    }
  }

  async listItems(tenantId: string) {
    const integration = await this.getIntegrationForTenant(tenantId);
    const apiDomain = this.zohoApiDomain();
    const orgId =
      process.env.ZOHO_ORG_ID || integration.tenant_external_id || '';
    const url =
      `${apiDomain}/books/v3/items` +
      (orgId ? `?organization_id=${orgId}` : '');
    try {
      const resp = await axios.get(url, {
        headers: {
          Authorization: `Zoho-oauthtoken ${integration.access_token}`,
        },
        timeout: 10000,
      });
      return { ok: true, data: resp.data };
    } catch (err) {
      this.logger.error('Zoho listItems failed', err);
      return { ok: false, error: String(err) };
    }
  }

  async importCustomers(
    tenantId: string,
    overrides: Array<{
      externalId: string;
      localEntity: string;
      localId: string;
    }> = [],
  ) {
    const resp = await this.listCustomers(tenantId);
    if (!resp.ok)
      return { ok: false, error: 'Failed to fetch customers from Zoho' };
    const contacts = resp.data?.contacts || resp.data?.data || [];
    const results = { created: 0, updated: 0, skipped: 0, errors: [] as any[] };

    // apply overrides into integrationMapping table
    for (const ov of overrides || []) {
      try {
        const existingMap = await this.prisma.integrationMapping.findFirst({
          where: {
            tenant_id: tenantId,
            provider: 'zoho',
            external_id: ov.externalId,
            local_entity: ov.localEntity,
          },
        });
        if (existingMap) {
          await this.prisma.integrationMapping.update({
            where: { id: existingMap.id },
            data: { local_id: ov.localId },
          });
        } else {
          await this.prisma.integrationMapping.create({
            data: {
              tenant_id: tenantId,
              provider: 'zoho',
              external_id: ov.externalId,
              local_entity: ov.localEntity,
              local_id: ov.localId,
            },
          });
        }
      } catch (err) {
        this.logger.warn('Failed to apply override', err);
      }
    }
    for (const c of contacts) {
      try {
        const externalId =
          c.contact_id ||
          c.contact_id ||
          c.contact_id ||
          c.contact_id ||
          String(c.contact_id || c.contact_id || Math.random()).toString();
        const mapping = await this.prisma.integrationMapping.findFirst({
          where: {
            tenant_id: tenantId,
            provider: 'zoho',
            external_id: externalId,
            local_entity: 'Client',
          },
        });
        const email =
          (c.email && String(c.email).toLowerCase()) ||
          (c.contact_persons && c.contact_persons[0]?.email) ||
          null;
        const name = c.contact_name || c.name || c.contact_name || 'Unknown';
        const phone =
          c.phone ||
          c.mobile ||
          (c.contact_persons && c.contact_persons[0]?.phone) ||
          null;
        const website = c.website || null;

        const tenant_id = tenantId;

        // If mapping exists, update directly
        if (mapping && mapping.local_id) {
          const existing = await this.prisma.client.findUnique({
            where: { id: mapping.local_id },
          });
          if (existing) {
            await this.prisma.client.update({
              where: { id: existing.id },
              data: { name, phone, website, updated_at: new Date() },
            });
            results.updated += 1;
            continue;
          }
        }

        const safeEmail = email || `zoho-${externalId}@zoho-import.local`;
        const existingByEmail = await this.prisma.client.findFirst({
          where: { tenant_id, email: safeEmail },
        });
        if (existingByEmail) {
          await this.prisma.client.update({
            where: { id: existingByEmail.id },
            data: { name, phone, website, updated_at: new Date() },
          });
          // persist mapping
          const existingMap = await this.prisma.integrationMapping.findFirst({
            where: {
              tenant_id: tenantId,
              provider: 'zoho',
              external_id: externalId,
              local_entity: 'Client',
            },
          });
          if (existingMap) {
            await this.prisma.integrationMapping.update({
              where: { id: existingMap.id },
              data: { local_id: existingByEmail.id },
            });
          } else {
            await this.prisma.integrationMapping.create({
              data: {
                tenant_id: tenantId,
                provider: 'zoho',
                external_id: externalId,
                local_entity: 'Client',
                local_id: existingByEmail.id,
              },
            });
          }
          results.updated += 1;
        } else {
          const created = await this.prisma.client.create({
            data: {
              tenant_id,
              name,
              email: safeEmail,
              phone,
              website,
              type: 'B2B',
            },
          });
          // persist mapping
          await this.prisma.integrationMapping.create({
            data: {
              tenant_id: tenantId,
              provider: 'zoho',
              external_id: externalId,
              local_entity: 'Client',
              local_id: created.id,
            },
          });
          results.created += 1;
        }
      } catch (err) {
        results.errors.push({ item: c, error: String(err) });
      }
    }

    return { ok: true, results };
  }

  async importItems(
    tenantId: string,
    overrides: Array<{
      externalId: string;
      localEntity: string;
      localId: string;
    }> = [],
  ) {
    const resp = await this.listItems(tenantId);
    if (!resp.ok)
      return { ok: false, error: 'Failed to fetch items from Zoho' };
    const items = resp.data?.items || resp.data?.data || [];
    const results = { created: 0, updated: 0, skipped: 0, errors: [] as any[] };

    // apply overrides into integrationMapping table
    for (const ov of overrides || []) {
      try {
        const existingMap = await this.prisma.integrationMapping.findFirst({
          where: {
            tenant_id: tenantId,
            provider: 'zoho',
            external_id: ov.externalId,
            local_entity: ov.localEntity,
          },
        });
        if (existingMap) {
          await this.prisma.integrationMapping.update({
            where: { id: existingMap.id },
            data: { local_id: ov.localId },
          });
        } else {
          await this.prisma.integrationMapping.create({
            data: {
              tenant_id: tenantId,
              provider: 'zoho',
              external_id: ov.externalId,
              local_entity: ov.localEntity,
              local_id: ov.localId,
            },
          });
        }
      } catch (err) {
        this.logger.warn('Failed to apply override', err);
      }
    }
    for (const it of items) {
      try {
        const externalId = this.normalizeExternalId(it.item_id);
        const mapping = await this.prisma.integrationMapping.findFirst({
          where: {
            tenant_id: tenantId,
            provider: 'zoho',
            external_id: externalId,
            local_entity: 'Product',
          },
        });
        const sku = this.normalizeSku(
          it.sku || it.item_code || it.code || it.name,
        );
        const name = it.name || it.item_name || 'Unknown';
        const price = Number(it.rate || it.list_price || 0) || 0;
        const tenant_id = tenantId;

        // If mapping exists, update directly
        if (mapping && mapping.local_id) {
          const existingById = await this.prisma.product.findUnique({
            where: { id: mapping.local_id },
          });
          if (existingById) {
            await this.prisma.product.update({
              where: { id: existingById.id },
              data: { name, price, updated_at: new Date() },
            });
            results.updated += 1;
            continue;
          }
        }

        const existing = await this.prisma.product.findFirst({
          where: { tenant_id, sku },
        });
        if (existing) {
          await this.prisma.product.update({
            where: { id: existing.id },
            data: { name, price, updated_at: new Date() },
          });
          // persist mapping
          const existingMap = await this.prisma.integrationMapping.findFirst({
            where: {
              tenant_id: tenantId,
              provider: 'zoho',
              external_id: externalId,
              local_entity: 'Product',
            },
          });
          if (existingMap) {
            await this.prisma.integrationMapping.update({
              where: { id: existingMap.id },
              data: { local_id: existing.id },
            });
          } else {
            await this.prisma.integrationMapping.create({
              data: {
                tenant_id: tenantId,
                provider: 'zoho',
                external_id: externalId,
                local_entity: 'Product',
                local_id: existing.id,
              },
            });
          }
          results.updated += 1;
        } else {
          // Ensure a category exists
          let categoryId: string;
          const defaultCat = await this.prisma.productCategory.findFirst({
            where: { tenant_id, name: 'Imported' },
          });
          if (defaultCat) categoryId = defaultCat.id;
          else {
            const cat = await this.prisma.productCategory.create({
              data: { tenant_id, name: 'Imported' },
            });
            categoryId = cat.id;
          }

          const created = await this.prisma.product.create({
            data: {
              tenant_id,
              sku,
              name,
              price,
              category_id: categoryId,
              unit: 'pcs',
              cost: 0,
              stock: 0,
            },
          });
          // persist mapping
          await this.prisma.integrationMapping.create({
            data: {
              tenant_id: tenantId,
              provider: 'zoho',
              external_id: externalId,
              local_entity: 'Product',
              local_id: created.id,
            },
          });
          results.created += 1;
        }
      } catch (err) {
        results.errors.push({ item: it, error: String(err) });
      }
    }

    return { ok: true, results };
  }
}
