import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class RetryMessageDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  force_retry?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  reason?: string;
}
