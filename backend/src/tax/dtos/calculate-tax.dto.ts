import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CalculateTaxDto {
  @IsNumber()
  amount: number;

  @IsString()
  tax_profile_id: string;

  @IsOptional()
  @IsString()
  client_id?: string;
}
