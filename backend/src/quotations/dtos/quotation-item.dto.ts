import { IsNumber, IsString, Min } from 'class-validator';

export class QuotationItemDto {
  @IsString()
  product_id!: string;

  @IsString()
  product_name!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsString()
  unit!: string;

  @IsNumber()
  @Min(0)
  unit_price!: number;

  @IsNumber()
  @Min(0)
  tax_percent!: number;
}
