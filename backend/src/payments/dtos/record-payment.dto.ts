import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class RecordPaymentDto {
  @IsString()
  invoice_id: string;

  @IsNumber()
  @Min(0.01, { message: 'Payment amount must be at least 0.01' })
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
