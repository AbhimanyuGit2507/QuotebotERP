import { IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuotationItemDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_abc123' })
  @IsString()
  product_id!: string;

  @ApiProperty({ description: 'Product name', example: 'Industrial Bearing 6205' })
  @IsString()
  product_name!: string;

  @ApiProperty({ description: 'Quantity', example: 10 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({ description: 'Unit of measurement', example: 'pcs' })
  @IsString()
  unit!: string;

  @ApiProperty({ description: 'Unit price (₹)', example: 1500 })
  @IsNumber()
  @Min(0)
  unit_price!: number;

  @ApiProperty({ description: 'Tax percentage', example: 18 })
  @IsNumber()
  @Min(0)
  tax_percent!: number;
}
