import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompany(tenantId: string) {
    return this.prisma.settingsCompany.upsert({
      where: { tenant_id: tenantId },
      update: {},
      create: { tenant_id: tenantId },
    });
  }

  async updateCompany(
    tenantId: string,
    body: Partial<{
      currency: string;
      logo_url: string;
      profile_json: Record<string, unknown>;
    }>,
  ) {
    const updateData: Partial<{
      currency: string;
      logo_url: string | null;
      profile_json: Prisma.InputJsonValue | undefined;
    }> = {};

    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.logo_url !== undefined)
      updateData.logo_url = body.logo_url ?? null;
    if (body.profile_json !== undefined)
      updateData.profile_json = body.profile_json as Prisma.InputJsonValue;

    // Sync company_gstin from profile_json.gstin for the tax engine
    if (body.profile_json && typeof body.profile_json === 'object') {
      const gstin = body.profile_json.gstin;
      if (typeof gstin === 'string') {
        (updateData as any).company_gstin = gstin || null;
      }
    }

    return this.prisma.settingsCompany.upsert({
      where: { tenant_id: tenantId },
      update: updateData as unknown as Prisma.SettingsCompanyUpdateInput,
      create: {
        tenant_id: tenantId,
        currency: body.currency ?? 'INR',
        logo_url: body.logo_url ?? null,
        profile_json: (body.profile_json ?? undefined) as Prisma.InputJsonValue,
        ...(body.profile_json &&
        typeof body.profile_json === 'object' &&
        typeof (body.profile_json as any).gstin === 'string'
          ? { company_gstin: (body.profile_json as any).gstin || null }
          : {}),
      },
    });
  }

  async getNotifications(tenantId: string) {
    return this.prisma.settingsNotifications.upsert({
      where: { tenant_id: tenantId },
      update: {},
      create: { tenant_id: tenantId },
    });
  }

  async updateNotifications(
    tenantId: string,
    body: Partial<{
      new_rfq: boolean;
      quote_sent: boolean;
      quote_viewed: boolean;
      quote_accepted: boolean;
      quote_declined: boolean;
    }>,
  ) {
    return this.prisma.settingsNotifications.upsert({
      where: { tenant_id: tenantId },
      update: body,
      create: {
        tenant_id: tenantId,
        new_rfq: body.new_rfq ?? true,
        quote_sent: body.quote_sent ?? true,
        quote_viewed: body.quote_viewed ?? true,
        quote_accepted: body.quote_accepted ?? true,
        quote_declined: body.quote_declined ?? true,
      },
    });
  }

  async getTemplates(tenantId: string) {
    return this.prisma.settingsTemplate.findMany({
      where: { tenant_id: tenantId },
      orderBy: { template_key: 'asc' },
    });
  }

  async createTemplate(
    tenantId: string,
    body: { template_key: string; content: string },
  ) {
    return this.prisma.settingsTemplate.upsert({
      where: {
        tenant_id_template_key: {
          tenant_id: tenantId,
          template_key: body.template_key,
        },
      },
      update: { content: body.content },
      create: {
        tenant_id: tenantId,
        template_key: body.template_key,
        content: body.content,
      },
    });
  }

  async updateTemplate(
    id: string,
    tenantId: string,
    body: Partial<{ content: string; template_key: string }>,
  ) {
    return this.prisma.settingsTemplate.updateMany({
      where: { id, tenant_id: tenantId },
      data: body,
    });
  }

  async deleteTemplate(id: string, tenantId: string) {
    await this.prisma.settingsTemplate.deleteMany({
      where: { id, tenant_id: tenantId },
    });
    return { message: 'Template deleted successfully' };
  }

  async getAutomationRules(tenantId: string) {
    return this.prisma.automationRule.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createAutomationRule(
    tenantId: string,
    body: { name: string; condition: string; action: string; active?: boolean },
  ) {
    return this.prisma.automationRule.create({
      data: {
        tenant_id: tenantId,
        name: body.name,
        condition: body.condition,
        action: body.action,
        active: body.active ?? true,
      },
    });
  }

  async updateAutomationRule(
    id: string,
    tenantId: string,
    body: Partial<{
      name: string;
      condition: string;
      action: string;
      active: boolean;
    }>,
  ) {
    return this.prisma.automationRule.updateMany({
      where: { id, tenant_id: tenantId },
      data: body,
    });
  }

  async deleteAutomationRule(id: string, tenantId: string) {
    await this.prisma.automationRule.deleteMany({
      where: { id, tenant_id: tenantId },
    });
    return { message: 'Automation rule deleted successfully' };
  }
}
