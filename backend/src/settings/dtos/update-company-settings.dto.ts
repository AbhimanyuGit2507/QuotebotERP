import { IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsUrl()
  logo_url?: string;

  @IsOptional()
  @IsObject()
  profile_json?: Record<string, unknown>;
}
