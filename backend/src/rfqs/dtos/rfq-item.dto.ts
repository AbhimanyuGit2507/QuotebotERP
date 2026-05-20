import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RfqItemDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_abc123' })
  @IsString()
  product_id!: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Industrial Bearing 6205',
  })
  @IsString()
  product_name!: string;

  @ApiProperty({ description: 'Requested quantity', example: 50 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({ description: 'Unit of measurement', example: 'pcs' })
  @IsString()
  unit!: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Need ABEC-7 precision grade',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
