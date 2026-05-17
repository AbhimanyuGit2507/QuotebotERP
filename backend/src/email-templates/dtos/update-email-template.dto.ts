import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  subject_template?: string;

  @IsOptional()
  @IsString()
  body_template?: string;

  @IsOptional()
  @IsObject()
  variables_help?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
