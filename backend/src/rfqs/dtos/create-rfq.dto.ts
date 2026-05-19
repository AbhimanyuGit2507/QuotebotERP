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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RfqItemDto } from './rfq-item.dto';

export class CreateRfqDto {
  @ApiProperty({ description: 'Client ID', example: 'client_abc123' })
  @IsString()
  client_id!: string;

  @ApiProperty({ description: 'Channel through which RFQ was received', example: 'email', enum: ['email', 'whatsapp', 'manual'] })
  @IsIn(['email', 'whatsapp', 'manual'])
  channel!: string;

  @ApiPropertyOptional({ description: 'Priority level', example: 'medium', enum: ['low', 'medium', 'high'] })
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: string;

  @ApiPropertyOptional({ description: 'RFQ status', example: 'pending', enum: ['pending', 'quoted', 'converted', 'expired', 'spam'] })
  @IsOptional()
  @IsIn(['pending', 'quoted', 'converted', 'expired', 'spam'])
  status?: string;

  @ApiPropertyOptional({ description: 'AI confidence score (0-100)', example: 85 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  confidence_score?: number;

  @ApiPropertyOptional({ description: 'Due date (ISO 8601)', example: '2024-01-30' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({ description: 'Line items for the RFQ', type: [RfqItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RfqItemDto)
  items?: RfqItemDto[];
}
