import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RfqsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['pending', 'quoted', 'converted', 'expired', 'spam'])
  status?: string;

  @IsOptional()
  @IsIn(['email', 'whatsapp', 'manual'])
  channel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
