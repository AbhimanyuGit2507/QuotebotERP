import { IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateTaxDto {
  @ApiProperty({ description: 'Base amount for tax calculation (₹)', example: 10000 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Tax profile ID to use', example: 'tax_abc123' })
  @IsString()
  tax_profile_id: string;

  @ApiPropertyOptional({ description: 'Client ID for location-based tax rules', example: 'client_abc123' })
  @IsOptional()
  @IsString()
  client_id?: string;
}
