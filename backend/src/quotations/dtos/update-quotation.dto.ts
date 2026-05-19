import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuotationItemDto } from './quotation-item.dto';

export class UpdateQuotationDto {
  @ApiPropertyOptional({ description: 'Client ID', example: 'client_abc123' })
  @IsOptional()
  @IsString()
  client_id?: string;

  @ApiPropertyOptional({ description: 'Quotation date (ISO 8601)', example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Valid until date (ISO 8601)', example: '2024-02-15' })
  @IsOptional()
  @IsDateString()
  valid_until?: string;

  @ApiPropertyOptional({ description: 'Quotation status', example: 'draft', enum: ['draft', 'sent', 'accepted', 'declined'] })
  @IsOptional()
  @IsIn(['draft', 'sent', 'accepted', 'declined'])
  status?: string;

  @ApiPropertyOptional({ description: 'Terms and conditions text' })
  @IsOptional()
  @IsString()
  terms_conditions?: string;

  @ApiPropertyOptional({ description: 'Line items for the quotation', type: [QuotationItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items?: QuotationItemDto[];
}
