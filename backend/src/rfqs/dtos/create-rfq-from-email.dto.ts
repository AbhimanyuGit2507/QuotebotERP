import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRfqFromEmailItemDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsString()
  product_name?: string;

  @IsOptional()
  @IsString()
  name?: string;

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

export class CreateRfqFromEmailDto {
  @IsString()
  client_email!: string;

  @IsString()
  message_id!: string;

  @IsOptional()
  @IsString()
  parsing_confidence?: string;

  @IsOptional()
  @IsString()
  parsing_source?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRfqFromEmailItemDto)
  items!: CreateRfqFromEmailItemDto[];
}
