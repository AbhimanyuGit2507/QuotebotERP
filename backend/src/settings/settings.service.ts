import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import Ajv, { ValidateFunction } from 'ajv';
import { readFileSync } from 'fs';
import { join } from 'path';

const ajv = new Ajv({ allErrors: true });

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  // Namespaced generic settings
  async getNamespace(tenantId: string, namespace: string) {
    if (!tenantId || !namespace) throw new BadRequestException('tenantId and namespace required');
    const rows = await this.prisma.setting.findMany({
      where: { tenant_id: tenantId, namespace },
      orderBy: { key: 'asc' },
    });

    const result: Record<string, any> = {};
    for (const r of rows) result[r.key] = r.value;
    return { tenantId, namespace, settings: result };
  }

  async upsertNamespace(tenantId: string, namespace: string, payload: Record<string, any>, userId?: string) {
    if (!tenantId || !namespace) throw new BadRequestException('tenantId and namespace required');
    if (!payload || typeof payload !== 'object') throw new BadRequestException('payload must be an object');
    // Validate against schema if available
    const validator = this.loadValidatorForNamespace(namespace);
    if (validator) {
      const ok = validator(payload);
      if (!ok) {
        const errors = validator.errors || [];
        throw new BadRequestException({ message: 'Validation failed', errors });
      }
    }
    // Record before state
    const existingRows = await this.prisma.setting.findMany({ where: { tenant_id: tenantId, namespace } });
    const before: Record<string, any> = {};
    for (const r of existingRows) before[r.key] = r.value;

    const keys = Object.keys(payload);
    const results: Array<{ key: string; ok: boolean }> = [];
    for (const key of keys) {
      const value = payload[key];
      await this.prisma.setting.upsert({
        where: { tenant_id_namespace_key: { tenant_id: tenantId, namespace, key } },
        update: { value },
        create: { tenant_id: tenantId, namespace, key, value },
      });
      results.push({ key, ok: true });
    }

    // Audit the namespace change as a single event
    try {
      await this.audit.createEvent({
        tenantId,
        userId: userId ?? null,
        action: 'upsert_namespace',
        entityType: 'SettingNamespace',
        entityId: `${tenantId}:${namespace}`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(payload),
      });
    } catch (e) {
      // don't fail the operation if audit logging fails
      // eslint-disable-next-line no-console
      console.warn('Audit log failed for upsertNamespace', e);
    }

    return { updated: results.length, details: results };
  }

  private loadValidatorForNamespace(namespace: string): ValidateFunction | null {
    try {
      const schemaPath = join(__dirname, 'schemas', `${namespace}.json`);
      const raw = readFileSync(schemaPath, 'utf8');
      const schema = JSON.parse(raw);
      return ajv.compile(schema);
    } catch (err) {
      return null;
    }
  }

  // Typed settings and helpers (company, notifications, templates, automation rules)
  async getCompany(tenantId: string) {
    return this.prisma.settingsCompany.upsert({ where: { tenant_id: tenantId }, update: {}, create: { tenant_id: tenantId } });
  }

  async updateCompany(tenantId: string, body: Partial<{ currency: string; logo_url: string; profile_json: Record<string, unknown> }>, userId?: string) {
    const updateData: any = {};
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url ?? null;
    if (body.profile_json !== undefined) updateData.profile_json = body.profile_json as Prisma.InputJsonValue;
    if (body.profile_json && typeof body.profile_json === 'object') {
      const gstin = (body.profile_json as any).gstin;
      if (typeof gstin === 'string') updateData.company_gstin = gstin || null;
    }
    const before = await this.prisma.settingsCompany.findUnique({ where: { tenant_id: tenantId } });
    const result = await this.prisma.settingsCompany.upsert({
      where: { tenant_id: tenantId },
      update: updateData,
      create: {
        tenant_id: tenantId,
        currency: body.currency ?? 'INR',
        logo_url: body.logo_url ?? null,
        profile_json: (body.profile_json ?? undefined) as Prisma.InputJsonValue,
        ...(body.profile_json && typeof body.profile_json === 'object' && typeof (body.profile_json as any).gstin === 'string' ? { company_gstin: (body.profile_json as any).gstin || null } : {}),
      },
    });

    try {
      await this.audit.createEvent({
        tenantId,
        userId: userId ?? null,
        action: 'update_company',
        entityType: 'SettingsCompany',
        entityId: tenantId,
        beforeJson: JSON.stringify(before ?? {}),
        afterJson: JSON.stringify(result ?? {}),
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Audit log failed for updateCompany', e);
    }

    return result;
  }

  async getNotifications(tenantId: string) {
    return this.prisma.settingsNotifications.upsert({ where: { tenant_id: tenantId }, update: {}, create: { tenant_id: tenantId } });
  }

  async updateNotifications(tenantId: string, body: Partial<{ new_rfq: boolean; quote_sent: boolean; quote_viewed: boolean; quote_accepted: boolean; quote_declined: boolean }>, userId?: string) {
    const before = await this.prisma.settingsNotifications.findUnique({ where: { tenant_id: tenantId } });
    const result = await this.prisma.settingsNotifications.upsert({ where: { tenant_id: tenantId }, update: body, create: { tenant_id: tenantId, new_rfq: body.new_rfq ?? true, quote_sent: body.quote_sent ?? true, quote_viewed: body.quote_viewed ?? true, quote_accepted: body.quote_accepted ?? true, quote_declined: body.quote_declined ?? true } });

    try {
      await this.audit.createEvent({
        tenantId,
        userId: userId ?? null,
        action: 'update_notifications',
        entityType: 'SettingsNotifications',
        entityId: tenantId,
        beforeJson: JSON.stringify(before ?? {}),
        afterJson: JSON.stringify(result ?? {}),
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Audit log failed for updateNotifications', e);
    }

    return result;
  }

  async getTemplates(tenantId: string) {
    return this.prisma.settingsTemplate.findMany({ where: { tenant_id: tenantId }, orderBy: { template_key: 'asc' } });
  }

  async createTemplate(tenantId: string, body: { template_key: string; content: string }) {
    return this.prisma.settingsTemplate.upsert({ where: { tenant_id_template_key: { tenant_id: tenantId, template_key: body.template_key } }, update: { content: body.content }, create: { tenant_id: tenantId, template_key: body.template_key, content: body.content } });
  }

  async updateTemplate(id: string, tenantId: string, body: Partial<{ content: string; template_key: string }>) {
    return this.prisma.settingsTemplate.updateMany({ where: { id, tenant_id: tenantId }, data: body });
  }

  async deleteTemplate(id: string, tenantId: string) {
    await this.prisma.settingsTemplate.deleteMany({ where: { id, tenant_id: tenantId } });
    return { message: 'Template deleted successfully' };
  }

  async getAutomationRules(tenantId: string) {
    return this.prisma.automationRule.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' } });
  }

  async createAutomationRule(tenantId: string, body: { name: string; condition: string; action: string; active?: boolean }) {
    return this.prisma.automationRule.create({ data: { tenant_id: tenantId, name: body.name, condition: body.condition, action: body.action, active: body.active ?? true } });
  }

  async updateAutomationRule(id: string, tenantId: string, body: Partial<{ name: string; condition: string; action: string; active: boolean }>) {
    return this.prisma.automationRule.updateMany({ where: { id, tenant_id: tenantId }, data: body });
  }

  async deleteAutomationRule(id: string, tenantId: string) {
    await this.prisma.automationRule.deleteMany({ where: { id, tenant_id: tenantId } });
    return { message: 'Automation rule deleted successfully' };
  }
}
