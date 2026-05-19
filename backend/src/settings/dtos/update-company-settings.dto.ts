import { IsObject, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ description: 'Default currency code', example: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Company logo URL', example: 'https://company.com/logo.png' })
  @IsOptional()
  @IsUrl()
  logo_url?: string;

  @ApiPropertyOptional({ description: 'Company profile JSON (name, address, etc.)' })
  @IsOptional()
  @IsObject()
  profile_json?: Record<string, unknown>;
}
