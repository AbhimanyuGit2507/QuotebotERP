import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ParsedItemDto {
  @IsOptional()
  @IsString()
  product_name?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMessageProcessingStatusDto {
  @IsIn(['pending', 'parsed', 'failed'])
  processing_status!: 'pending' | 'parsed' | 'failed';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParsedItemDto)
  parsed_items?: ParsedItemDto[];

  @IsOptional()
  @IsString()
  parsing_source?: string;

  @IsOptional()
  @IsString()
  parsing_confidence?: string;

  @IsOptional()
  @IsString()
  parsing_error?: string;

  @IsOptional()
  @IsString()
  rfq_id?: string;

  @IsOptional()
  @IsString()
  quotation_id?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  auto_rfq_created?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  auto_quotation_created?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  force_retry?: boolean;
}
