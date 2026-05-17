import { EmailTemplateType } from '@prisma/client';
export declare class CreateEmailTemplateDto {
    template_type: EmailTemplateType;
    subject_template: string;
    body_template: string;
    variables_help?: Record<string, string>;
    is_active?: boolean;
}
