import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateJournalEntryDto {
  @IsString()
  date: string;

  @IsString()
  description: string;

  @IsString()
  debitAccountId: string;

  @IsString()
  creditAccountId: string;

  @IsNumber()
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  amount: number;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;
}
