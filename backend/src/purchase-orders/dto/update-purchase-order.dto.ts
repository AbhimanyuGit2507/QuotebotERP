import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsOptional()
  @IsString()
  supplier_id?: string;

  @ApiPropertyOptional({ description: 'Expected delivery date (ISO 8601)' })
  @IsOptional()
  @IsString()
  expected_delivery?: string;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
