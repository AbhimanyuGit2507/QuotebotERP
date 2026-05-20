import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordPaymentDto {
  @ApiProperty({
    description: 'Invoice ID to record payment against',
    example: 'inv_abc123',
  })
  @IsString()
  invoice_id: string;

  @ApiProperty({ description: 'Payment amount (₹)', example: 15000.0 })
  @IsNumber()
  @Min(0.01, { message: 'Payment amount must be at least 0.01' })
  amount: number;

  @ApiProperty({ description: 'Payment method', example: 'bank_transfer' })
  @IsString()
  payment_method: string;

  @ApiPropertyOptional({
    description: 'External reference number',
    example: 'TXN-2024-001',
  })
  @IsOptional()
  @IsString()
  reference_number?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Partial payment for Q1 order',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
