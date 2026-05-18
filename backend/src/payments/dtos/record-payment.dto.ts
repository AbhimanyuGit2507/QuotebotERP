import { IsString, IsNumber, IsOptional } from 'class-validator';

export class RecordPaymentDto {
  @IsString()
  invoice_id: string;

  @IsNumber()
  amount: number;

  @IsString()
  payment_method: string;

  @IsOptional()
  @IsString()
  reference_number?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
