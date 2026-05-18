import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
export declare class SettingsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getCompany(tenantId: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        currency: string;
        logo_url: string | null;
        profile_json: Prisma.JsonValue | null;
        quotation_approval_threshold: Prisma.Decimal | null;
        company_gstin: string | null;
    }>;
    updateCompany(tenantId: string, body: Partial<{
        currency: string;
        logo_url: string;
        profile_json: Record<string, unknown>;
    }>): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        currency: string;
        logo_url: string | null;
        profile_json: Prisma.JsonValue | null;
        quotation_approval_threshold: Prisma.Decimal | null;
        company_gstin: string | null;
    }>;
    getNotifications(tenantId: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        new_rfq: boolean;
        quote_sent: boolean;
        quote_viewed: boolean;
        quote_accepted: boolean;
        quote_declined: boolean;
    }>;
    updateNotifications(tenantId: string, body: Partial<{
        new_rfq: boolean;
        quote_sent: boolean;
        quote_viewed: boolean;
        quote_accepted: boolean;
        quote_declined: boolean;
    }>): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        new_rfq: boolean;
        quote_sent: boolean;
        quote_viewed: boolean;
        quote_accepted: boolean;
        quote_declined: boolean;
    }>;
    getTemplates(tenantId: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        template_key: string;
        content: string;
    }[]>;
    createTemplate(tenantId: string, body: {
        template_key: string;
        content: string;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        template_key: string;
        content: string;
    }>;
    updateTemplate(id: string, tenantId: string, body: Partial<{
        content: string;
        template_key: string;
    }>): Promise<Prisma.BatchPayload>;
    deleteTemplate(id: string, tenantId: string): Promise<{
        message: string;
    }>;
    getAutomationRules(tenantId: string): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        active: boolean;
        action: string;
        condition: string;
    }[]>;
    createAutomationRule(tenantId: string, body: {
        name: string;
        condition: string;
        action: string;
        active?: boolean;
    }): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        active: boolean;
        action: string;
        condition: string;
    }>;
    updateAutomationRule(id: string, tenantId: string, body: Partial<{
        name: string;
        condition: string;
        action: string;
        active: boolean;
    }>): Promise<Prisma.BatchPayload>;
    deleteAutomationRule(id: string, tenantId: string): Promise<{
        message: string;
    }>;
}
