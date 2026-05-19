import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJournalEntryDto {
  @ApiProperty({ description: 'Entry date (ISO 8601)', example: '2024-01-15' })
  @IsString()
  date: string;

  @ApiProperty({ description: 'Entry description', example: 'Monthly rent payment' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Debit account ID', example: 'acc_debit123' })
  @IsString()
  debitAccountId: string;

  @ApiProperty({ description: 'Credit account ID', example: 'acc_credit456' })
  @IsString()
  creditAccountId: string;

  @ApiProperty({ description: 'Entry amount (₹)', example: 25000.00 })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  amount: number;

  @ApiPropertyOptional({ description: 'Reference entity type (e.g., invoice, payment)', example: 'invoice' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Reference entity ID', example: 'inv_abc123' })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
