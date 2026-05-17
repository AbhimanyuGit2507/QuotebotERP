import { IsIn, IsOptional, IsString } from 'class-validator';

export class ProductsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
