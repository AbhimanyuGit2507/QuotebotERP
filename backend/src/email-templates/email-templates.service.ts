import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailTemplate, EmailTemplateType } from '@prisma/client';
import { CreateEmailTemplateDto } from './dtos/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dtos/update-email-template.dto';

@Injectable()
export class EmailTemplatesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all email templates for a tenant
   */
  async findAll(tenantId: string) {
    return this.prisma.emailTemplate.findMany({
      where: { tenant_id: tenantId },
      orderBy: { template_type: 'asc' },
    });
  }

  /**
   * Get a specific template by type
   */
  async findByType(tenantId: string, templateType: EmailTemplateType) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: {
        tenant_id_template_type: {
          tenant_id: tenantId,
          template_type: templateType,
        },
      },
    });

    // Return default template if none exists
    if (!template) {
      return this.getDefaultTemplate(templateType);
    }

    return template;
  }

  /**
   * Create or update an email template
   */
  async upsert(tenantId: string, dto: CreateEmailTemplateDto) {
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

  /**
   * Update an existing template
   */
  async update(id: string, tenantId: string, dto: UpdateEmailTemplateDto) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    return this.prisma.emailTemplate.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete a template
   */
  async delete(id: string, tenantId: string) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    return this.prisma.emailTemplate.delete({
      where: { id },
    });
  }

  /**
   * Substitute variables in a template
   * Variables are in the format {{variable_name}}
   */
  substituteVariables(
    template: string,
    variables: Record<string, any>,
  ): string {
    let result = template;

    // Replace all {{variable_name}} with actual values
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(
        regex,
        value !== null && value !== undefined ? String(value) : '',
      );
    }

    return result;
  }

  /**
   * Get default templates if none are configured
   */
  private getDefaultTemplate(templateType: EmailTemplateType) {
    const defaults = {
      [EmailTemplateType.QUOTATION_EMAIL]: {
        template_type: EmailTemplateType.QUOTATION_EMAIL,
        subject_template:
          'Quotation {{quotation_number}} from {{company_name}}',
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

{{availability_warnings}}

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
          item_details: 'List of all quoted items with availability status',
          availability_warnings:
            'Summary of items with stock issues (out of stock, limited availability)',
          stock_warnings: 'Additional stock/fulfillment warnings if any',
          custom_message: 'Optional custom message',
        },
        is_active: true,
      },
      [EmailTemplateType.INVOICE_EMAIL]: {
        template_type: EmailTemplateType.INVOICE_EMAIL,
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
      [EmailTemplateType.PO_EMAIL]: {
        template_type: EmailTemplateType.PO_EMAIL,
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
      [EmailTemplateType.INVOICE_PDF_HEADER]: {
        template_type: EmailTemplateType.INVOICE_PDF_HEADER,
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
      [EmailTemplateType.INVOICE_PDF_FOOTER]: {
        template_type: EmailTemplateType.INVOICE_PDF_FOOTER,
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

  /**
   * Get available variables for a template type
   */
  getAvailableVariables(
    templateType: EmailTemplateType,
  ): Record<string, string> {
    const defaultTemplate = this.getDefaultTemplate(templateType);
    if (!defaultTemplate?.variables_help) {
      return {};
    }
    return defaultTemplate.variables_help as unknown as Record<string, string>;
  }

  /**
   * Initialize default templates for a tenant
   */
  async initializeDefaultTemplates(tenantId: string): Promise<EmailTemplate[]> {
    const templateTypes = Object.values(EmailTemplateType);
    const created: EmailTemplate[] = [];

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
}
