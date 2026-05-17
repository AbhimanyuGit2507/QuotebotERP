import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RfqItemDto {
  @IsString()
  product_id!: string;

  @IsString()
  product_name!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
