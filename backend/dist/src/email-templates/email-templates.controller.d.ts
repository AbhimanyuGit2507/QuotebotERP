import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto } from './dtos/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dtos/update-email-template.dto';
import { EmailTemplateType } from '@prisma/client';
export declare class EmailTemplatesController {
    private readonly emailTemplatesService;
    constructor(emailTemplatesService: EmailTemplatesService);
    findAll(req: any): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        is_active: boolean;
        template_type: import("@prisma/client").$Enums.EmailTemplateType;
        subject_template: string;
        body_template: string;
        variables_help: import("@prisma/client/runtime/client").JsonValue | null;
    }[]>;
    findByType(req: any, type: EmailTemplateType): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        is_active: boolean;
        template_type: import("@prisma/client").$Enums.EmailTemplateType;
        subject_template: string;
        body_template: string;
        variables_help: import("@prisma/client/runtime/client").JsonValue | null;
    } | {
        template_type: "QUOTATION_EMAIL";
        subject_template: string;
        body_template: string;
        variables_help: {
            client_name: string;
            company_name: string;
            quotation_number: string;
            quotation_date: string;
            valid_until: string;
            currency: string;
            subtotal_amount: string;
            tax_amount: string;
            total_amount: string;
            item_details: string;
            stock_warnings: string;
            custom_message: string;
        };
        is_active: boolean;
    } | {
        template_type: "INVOICE_EMAIL";
        subject_template: string;
        body_template: string;
        variables_help: {
            client_name: string;
            company_name: string;
            invoice_number: string;
            invoice_date: string;
            due_date: string;
            currency: string;
            total_amount: string;
            payment_status: string;
            item_details: string;
        };
        is_active: boolean;
    } | {
        template_type: "PO_EMAIL";
        subject_template: string;
        body_template: string;
        variables_help: {
            client_name: string;
            company_name: string;
            po_number: string;
            po_status: string;
        };
        is_active: boolean;
    } | {
        template_type: "INVOICE_PDF_HEADER";
        subject_template: string;
        body_template: string;
        variables_help: {
            company_name: string;
            company_address: string;
            company_contact: string;
        };
        is_active: boolean;
    } | {
        template_type: "INVOICE_PDF_FOOTER";
        subject_template: string;
        body_template: string;
        variables_help: {
            terms_conditions: string;
        };
        is_active: boolean;
    }>;
    getAvailableVariables(type: EmailTemplateType): Record<string, string>;
    upsert(req: any, dto: CreateEmailTemplateDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        is_active: boolean;
        template_type: import("@prisma/client").$Enums.EmailTemplateType;
        subject_template: string;
        body_template: string;
        variables_help: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    initializeDefaults(req: any): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        is_active: boolean;
        template_type: import("@prisma/client").$Enums.EmailTemplateType;
        subject_template: string;
        body_template: string;
        variables_help: import("@prisma/client/runtime/client").JsonValue | null;
    }[]>;
    update(req: any, id: string, dto: UpdateEmailTemplateDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        is_active: boolean;
        template_type: import("@prisma/client").$Enums.EmailTemplateType;
        subject_template: string;
        body_template: string;
        variables_help: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    delete(req: any, id: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        is_active: boolean;
        template_type: import("@prisma/client").$Enums.EmailTemplateType;
        subject_template: string;
        body_template: string;
        variables_help: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
}
