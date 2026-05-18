import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Product SKU code', example: 'PROD-001' })
  @IsString()
  sku!: string;

  @ApiProperty({ description: 'Product name', example: 'Industrial Bearing 6205' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Category ID', example: 'cat_abc123' })
  @IsString()
  category_id!: string;

  @ApiProperty({ description: 'Unit of measurement', example: 'pcs' })
  @IsString()
  unit!: string;

  @ApiProperty({ description: 'Selling price (₹)', example: 1500.00 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ description: 'Cost price (₹)', example: 1000.00 })
  @IsNumber()
  @Min(0)
  cost!: number;

  @ApiPropertyOptional({ description: 'Current stock quantity', example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: 'Reorder level threshold', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorder_level?: number;

  @ApiPropertyOptional({ description: 'HSN code for tax classification', example: '8482' })
  @IsOptional()
  @IsString()
  hsn?: string;

  @ApiPropertyOptional({ description: 'GST percentage', example: 18 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gst_percent?: number;

  @ApiPropertyOptional({ description: 'Product description', example: 'Deep groove ball bearing' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Product status', example: 'active', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @ApiPropertyOptional({ description: 'Product image URL', example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsUrl()
  image_url?: string;
}
