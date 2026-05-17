import {
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { EmailTemplateType } from '@prisma/client';

export class CreateEmailTemplateDto {
  @IsEnum(EmailTemplateType)
  template_type: EmailTemplateType;

  @IsString()
  subject_template: string;

  @IsString()
  body_template: string;

  @IsOptional()
  @IsObject()
  variables_help?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
