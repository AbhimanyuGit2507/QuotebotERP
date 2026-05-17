import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { RfqItemDto } from './rfq-item.dto';

export class CreateRfqDto {
  @IsString()
  client_id!: string;

  @IsIn(['email', 'whatsapp', 'manual'])
  channel!: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: string;

  @IsOptional()
  @IsIn(['pending', 'quoted', 'converted', 'expired', 'spam'])
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  confidence_score?: number;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RfqItemDto)
  items?: RfqItemDto[];
}
