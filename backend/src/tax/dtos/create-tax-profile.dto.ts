import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaxProfileDto {
  @ApiProperty({ description: 'Tax profile name', example: 'GST 18%' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tax type', example: 'GST' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Tax rate percentage', example: 18 })
  @IsNumber()
  rate: number;

  @ApiPropertyOptional({ description: 'HSN code', example: '8482' })
  @IsOptional()
  @IsString()
  hsn_code?: string;

  @ApiPropertyOptional({ description: 'Set as default tax profile', example: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
