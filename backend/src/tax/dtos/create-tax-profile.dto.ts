import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateTaxProfileDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsNumber()
  rate: number;

  @IsOptional()
  @IsString()
  hsn_code?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
