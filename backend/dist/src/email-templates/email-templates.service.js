"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const client_1 = require("@prisma/client");
let EmailTemplatesService = class EmailTemplatesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId) {
        return this.prisma.emailTemplate.findMany({
            where: { tenant_id: tenantId },
            orderBy: { template_type: 'asc' },
        });
    }
    async findByType(tenantId, templateType) {
        const template = await this.prisma.emailTemplate.findUnique({
            where: {
                tenant_id_template_type: {
                    tenant_id: tenantId,
                    template_type: templateType,
                },
            },
        });
        if (!template) {
            return this.getDefaultTemplate(templateType);
        }
        return template;
    }
    async upsert(tenantId, dto) {
        return this.prisma.emailTemplate.upsert({
            where: {
                tenant_id_template_type: {
                    tenant_id: tenantId,
                    template_type: dto.template_type,
                },
            },
            create: {
                tenant_id: tenantId,
                ...dto,
            },
            update: {
                subject_template: dto.subject_template,
                body_template: dto.body_template,
                variables_help: dto.variables_help,
                is_active: dto.is_active ?? true,
            },
        });
    }
    async update(id, tenantId, dto) {
        const template = await this.prisma.emailTemplate.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!template) {
            throw new common_1.NotFoundException('Email template not found');
        }
        return this.prisma.emailTemplate.update({
            where: { id },
            data: dto,
        });
    }
    async delete(id, tenantId) {
        const template = await this.prisma.emailTemplate.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!template) {
            throw new common_1.NotFoundException('Email template not found');
        }
        return this.prisma.emailTemplate.delete({
            where: { id },
        });
    }
    substituteVariables(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            result = result.replace(regex, value !== null && value !== undefined ? String(value) : '');
        }
        return result;
    }
    getDefaultTemplate(templateType) {
        const defaults = {
            [client_1.EmailTemplateType.QUOTATION_EMAIL]: {
                template_type: client_1.EmailTemplateType.QUOTATION_EMAIL,
                subject_template: 'Quotation {{quotation_number}} from {{company_name}}',
                body_template: `Dear {{client_name}},

{{custom_message}}

Please find quotation {{quotation_number}} attached with the following details:

Quotation Number: {{quotation_number}}
Date: {{quotation_date}}
Valid Until: {{valid_until}}

Items:
{{item_details}}

Summary:
Subtotal: {{currency}} {{subtotal_amount}}
Tax/GST: {{currency}} {{tax_amount}}
Total: {{currency}} {{total_amount}}

{{stock_warnings}}

Best regards,
{{company_name}}`,
                variables_help: {
                    client_name: 'Client/customer name',
                    company_name: 'Your company name',
                    quotation_number: 'Quotation reference number',
                    quotation_date: 'Date of quotation',
                    valid_until: 'Validity date of quotation',
                    currency: 'Currency code (e.g., INR, USD)',
                    subtotal_amount: 'Subtotal before tax',
                    tax_amount: 'Tax/GST amount',
                    total_amount: 'Total quotation amount including tax',
                    item_details: 'List of all quoted items with availability',
                    stock_warnings: 'Stock/fulfillment warnings if any',
                    custom_message: 'Optional custom message',
                },
                is_active: true,
            },
            [client_1.EmailTemplateType.INVOICE_EMAIL]: {
                template_type: client_1.EmailTemplateType.INVOICE_EMAIL,
                subject_template: 'Invoice {{invoice_number}} from {{company_name}}',
                body_template: `Dear {{client_name}},

Please find invoice {{invoice_number}} for your order.

Invoice Number: {{invoice_number}}
Date: {{invoice_date}}
Due Date: {{due_date}}
Total: {{currency}} {{total_amount}}
{{payment_status}}

{{item_details}}

Thank you for your business.

Best regards,
{{company_name}}`,
                variables_help: {
                    client_name: 'Client/customer name',
                    company_name: 'Your company name',
                    invoice_number: 'Invoice reference number',
                    invoice_date: 'Date of invoice',
                    due_date: 'Payment due date',
                    currency: 'Currency code',
                    total_amount: 'Total invoice amount',
                    payment_status: 'Payment status information',
                    item_details: 'List of all invoice items',
                },
                is_active: true,
            },
            [client_1.EmailTemplateType.PO_EMAIL]: {
                template_type: client_1.EmailTemplateType.PO_EMAIL,
                subject_template: 'Purchase Order {{po_number}} Confirmation',
                body_template: `Dear {{client_name}},

We have received your purchase order {{po_number}}.

PO Number: {{po_number}}
Status: {{po_status}}

We will process your order and send the invoice shortly.

Thank you for your business.

Best regards,
{{company_name}}`,
                variables_help: {
                    client_name: 'Client/customer name',
                    company_name: 'Your company name',
                    po_number: 'Purchase order number',
                    po_status: 'Current status of the PO',
                },
                is_active: true,
            },
            [client_1.EmailTemplateType.INVOICE_PDF_HEADER]: {
                template_type: client_1.EmailTemplateType.INVOICE_PDF_HEADER,
                subject_template: 'Invoice PDF Header',
                body_template: `{{company_name}}
{{company_address}}
{{company_contact}}`,
                variables_help: {
                    company_name: 'Your company name',
                    company_address: 'Your company address',
                    company_contact: 'Contact information',
                },
                is_active: true,
            },
            [client_1.EmailTemplateType.INVOICE_PDF_FOOTER]: {
                template_type: client_1.EmailTemplateType.INVOICE_PDF_FOOTER,
                subject_template: 'Invoice PDF Footer',
                body_template: `Terms and Conditions:
{{terms_conditions}}

Thank you for your business!`,
                variables_help: {
                    terms_conditions: 'Terms and conditions text',
                },
                is_active: true,
            },
        };
        return defaults[templateType] || null;
    }
    getAvailableVariables(templateType) {
        const defaultTemplate = this.getDefaultTemplate(templateType);
        if (!defaultTemplate?.variables_help) {
            return {};
        }
        return defaultTemplate.variables_help;
    }
    async initializeDefaultTemplates(tenantId) {
        const templateTypes = Object.values(client_1.EmailTemplateType);
        const created = [];
        for (const templateType of templateTypes) {
            const existing = await this.prisma.emailTemplate.findUnique({
                where: {
                    tenant_id_template_type: {
                        tenant_id: tenantId,
                        template_type: templateType,
                    },
                },
            });
            if (!existing) {
                const defaultTemplate = this.getDefaultTemplate(templateType);
                if (defaultTemplate) {
                    const template = await this.prisma.emailTemplate.create({
                        data: {
                            tenant_id: tenantId,
                            template_type: defaultTemplate.template_type,
                            subject_template: defaultTemplate.subject_template,
                            body_template: defaultTemplate.body_template,
                            variables_help: defaultTemplate.variables_help,
                            is_active: defaultTemplate.is_active,
                        },
                    });
                    created.push(template);
                }
            }
        }
        return created;
    }
};
exports.EmailTemplatesService = EmailTemplatesService;
exports.EmailTemplatesService = EmailTemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmailTemplatesService);
//# sourceMappingURL=email-templates.service.js.map