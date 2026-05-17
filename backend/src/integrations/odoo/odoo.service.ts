/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class OdooService {
  private readonly logger = new Logger(OdooService.name);
  constructor(private readonly prisma: PrismaService) {}
  async testConnection(payload: {
    url: string;
    db?: string;
    username?: string;
    password?: string;
  }) {
    this.logger.log('Testing Odoo connection to ' + payload.url);
    try {
      const res = await axios.post(
        payload.url,
        {
          jsonrpc: '2.0',
          method: 'call',
          params: { service: 'common', method: 'version', args: [] },
          id: 1,
        },
        { timeout: 5000 },
      );
      return { ok: true, data: res.data };
    } catch (err) {
      this.logger.error('Odoo test connection failed', err);
      return { ok: false, error: String(err) };
    }
  }

  // Returning provider JSON payloads (typed as any)

  private async callJsonRpc(url: string, body: any): Promise<any> {
    const res = await axios.post(url, body, { timeout: 10000 });
    return res.data;
  }

  async login(
    url: string,
    db: string,
    username: string,
    password: string,
  ): Promise<any> {
    const body = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'common',
        method: 'login',
        args: [db, username, password],
      },
      id: 1,
    };
    const res = await this.callJsonRpc(url, body);
    return res?.result || null;
  }

  async listPartners(opts: {
    url: string;
    db: string;
    username: string;
    password: string;
    limit?: number;
  }) {
    try {
      const uid = await this.login(
        opts.url,
        opts.db,
        opts.username,
        opts.password,
      );
      if (!uid) return { ok: false, error: 'Login failed' };
      const body = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            opts.db,
            uid,
            opts.password,
            'res.partner',
            'search_read',
            [[], ['id', 'name', 'email', 'phone']],
            { limit: opts.limit || 50 },
          ],
        },
        id: 2,
      };
      const res = await this.callJsonRpc(opts.url, body);
      const data = res.result || [];
      // Attach mapping suggestions if possible
      return { ok: true, data };
    } catch (err) {
      this.logger.error('listPartners failed', err);
      return { ok: false, error: String(err) };
    }
  }

  async listProducts(opts: {
    url: string;
    db: string;
    username: string;
    password: string;
    limit?: number;
  }) {
    try {
      const uid = await this.login(
        opts.url,
        opts.db,
        opts.username,
        opts.password,
      );
      if (!uid) return { ok: false, error: 'Login failed' };
      const body = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            opts.db,
            uid,
            opts.password,
            'product.product',
            'search_read',
            [[], ['id', 'name', 'default_code', 'list_price']],
            { limit: opts.limit || 50 },
          ],
        },
        id: 3,
      };
      const res = await this.callJsonRpc(opts.url, body);
      const data = res.result || [];
      return { ok: true, data };
    } catch (err) {
      this.logger.error('listProducts failed', err);
      return { ok: false, error: String(err) };
    }
  }

  // Minimal import commit — uses DB-backed IntegrationMapping for idempotency
  async importPartners(
    tenantId: string,
    partners: any[],
    overrides: Array<{
      externalId: string;
      localEntity: string;
      localId: string;
    }> = [],
  ) {
    const results = { created: 0, updated: 0, errors: [] as any[] };
    // apply overrides first
    for (const ov of overrides || []) {
      try {
        const existingMap = await this.prisma.integrationMapping.findFirst({
          where: {
            tenant_id: tenantId,
            provider: 'odoo',
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
              provider: 'odoo',
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
    for (const p of partners) {
      try {
        const externalId = String(p.id || p.partner_id || Math.random());
        const mapping = await this.prisma.integrationMapping.findFirst({
          where: {
            tenant_id: tenantId,
            provider: 'odoo',
            external_id: externalId,
            local_entity: 'Client',
          },
        });
        const email = p.email || null;
        const name = p.name || 'Unknown';

        if (mapping && mapping.local_id) {
          const existing = await this.prisma.client.findUnique({
            where: { id: mapping.local_id },
          });
          if (existing) {
            await this.prisma.client.update({
              where: { id: existing.id },
              data: { name, updated_at: new Date() },
            });
            results.updated += 1;
            continue;
          }
        }

        const safeEmail = email || `odoo-${externalId}@odoo-import.local`;
        const existingByEmail = await this.prisma.client.findFirst({
          where: { tenant_id: tenantId, email: safeEmail },
        });
        if (existingByEmail) {
          await this.prisma.client.update({
            where: { id: existingByEmail.id },
            data: { name, updated_at: new Date() },
          });
          const existingMap = await this.prisma.integrationMapping.findFirst({
            where: {
              tenant_id: tenantId,
              provider: 'odoo',
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
                provider: 'odoo',
                external_id: externalId,
                local_entity: 'Client',
                local_id: existingByEmail.id,
              },
            });
          }
          results.updated += 1;
        } else {
          const created = await this.prisma.client.create({
            data: { tenant_id: tenantId, name, email: safeEmail, type: 'B2B' },
          });
          await this.prisma.integrationMapping.create({
            data: {
              tenant_id: tenantId,
              provider: 'odoo',
              external_id: externalId,
              local_entity: 'Client',
              local_id: created.id,
            },
          });
          results.created += 1;
        }
      } catch (err) {
        results.errors.push({ item: p, error: String(err) });
      }
    }

    return { ok: true, results };
  }

  async importProducts(
    tenantId: string,
    products: any[],
    overrides: Array<{
      externalId: string;
      localEntity: string;
      localId: string;
    }> = [],
  ) {
    const results = { created: 0, updated: 0, errors: [] as any[] };
    // apply overrides first
    for (const ov of overrides || []) {
      try {
        const existingMap = await this.prisma.integrationMapping.findFirst({
          where: {
            tenant_id: tenantId,
            provider: 'odoo',
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
              provider: 'odoo',
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
    for (const it of products) {
      try {
        const externalId = String(it.id || it.product_id || Math.random());
        const mapping = await this.prisma.integrationMapping.findFirst({
          where: {
            tenant_id: tenantId,
            provider: 'odoo',
            external_id: externalId,
            local_entity: 'Product',
          },
        });
        const sku = (
          it.default_code ||
          it.internal_reference ||
          it.name ||
          externalId
        ).toString();
        const name = it.name || 'Unknown';
        const price = Number(it.list_price || 0) || 0;

        if (mapping && mapping.local_id) {
          const existing = await this.prisma.product.findUnique({
            where: { id: mapping.local_id },
          });
          if (existing) {
            await this.prisma.product.update({
              where: { id: existing.id },
              data: { name, price, updated_at: new Date() },
            });
            results.updated += 1;
            continue;
          }
        }

        const existing = await this.prisma.product.findFirst({
          where: { tenant_id: tenantId, sku },
        });
        if (existing) {
          await this.prisma.product.update({
            where: { id: existing.id },
            data: { name, price, updated_at: new Date() },
          });
          const existingMap = await this.prisma.integrationMapping.findFirst({
            where: {
              tenant_id: tenantId,
              provider: 'odoo',
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
                provider: 'odoo',
                external_id: externalId,
                local_entity: 'Product',
                local_id: existing.id,
              },
            });
          }
          results.updated += 1;
        } else {
          let categoryId: string;
          const defaultCat = await this.prisma.productCategory.findFirst({
            where: { tenant_id: tenantId, name: 'Imported' },
          });
          if (defaultCat) categoryId = defaultCat.id;
          else {
            const cat = await this.prisma.productCategory.create({
              data: { tenant_id: tenantId, name: 'Imported' },
            });
            categoryId = cat.id;
          }
          const created = await this.prisma.product.create({
            data: {
              tenant_id: tenantId,
              sku,
              name,
              price,
              category_id: categoryId,
              unit: 'pcs',
              cost: 0,
              stock: 0,
            },
          });
          await this.prisma.integrationMapping.create({
            data: {
              tenant_id: tenantId,
              provider: 'odoo',
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
