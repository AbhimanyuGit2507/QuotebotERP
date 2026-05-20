import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ description: 'Account code', example: '1000' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Account name', example: 'Cash and Bank' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Account type',
    example: 'ASSET',
    enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'],
  })
  @IsString()
  @IsIn(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'])
  type: string;

  @ApiPropertyOptional({
    description: 'Parent account ID for sub-accounts',
    example: 'acc_parent123',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Account description',
    example: 'Primary cash and bank account',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
