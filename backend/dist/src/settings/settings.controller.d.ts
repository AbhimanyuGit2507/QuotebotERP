import { SettingsService } from './settings.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpdateCompanySettingsDto } from './dtos/update-company-settings.dto';
import { UpdateNotificationSettingsDto } from './dtos/update-notification-settings.dto';
import { CreateTemplateDto } from './dtos/create-template.dto';
import { UpdateTemplateDto } from './dtos/update-template.dto';
import { CreateAutomationRuleDto } from './dtos/create-automation-rule.dto';
import { UpdateAutomationRuleDto } from './dtos/update-automation-rule.dto';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    getCompany(user: AuthenticatedUser): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        currency: string;
        logo_url: string | null;
        profile_json: import("@prisma/client/runtime/client").JsonValue | null;
        quotation_approval_threshold: import("@prisma/client-runtime-utils").Decimal | null;
    }>;
    updateCompany(user: AuthenticatedUser, body: UpdateCompanySettingsDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        currency: string;
        logo_url: string | null;
        profile_json: import("@prisma/client/runtime/client").JsonValue | null;
        quotation_approval_threshold: import("@prisma/client-runtime-utils").Decimal | null;
    }>;
    getNotifications(user: AuthenticatedUser): Promise<{
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
    updateNotifications(user: AuthenticatedUser, body: UpdateNotificationSettingsDto): Promise<{
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
    getTemplates(user: AuthenticatedUser): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        template_key: string;
        content: string;
    }[]>;
    createTemplate(user: AuthenticatedUser, body: CreateTemplateDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        template_key: string;
        content: string;
    }>;
    updateTemplate(id: string, user: AuthenticatedUser, body: UpdateTemplateDto): Promise<import("@prisma/client").Prisma.BatchPayload>;
    deleteTemplate(id: string, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    getAutomationRules(user: AuthenticatedUser): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        active: boolean;
        action: string;
        condition: string;
    }[]>;
    createAutomationRule(user: AuthenticatedUser, body: CreateAutomationRuleDto): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        active: boolean;
        action: string;
        condition: string;
    }>;
    updateAutomationRule(id: string, user: AuthenticatedUser, body: UpdateAutomationRuleDto): Promise<import("@prisma/client").Prisma.BatchPayload>;
    deleteAutomationRule(id: string, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
}
