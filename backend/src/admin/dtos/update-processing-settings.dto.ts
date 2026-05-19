import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateProcessingSettingsDto {
  @ApiPropertyOptional({ description: 'Worker interval in milliseconds', example: 20000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  interval_ms?: number;

  @ApiPropertyOptional({ description: 'Maximum messages processed in one worker run', example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  run_batch_limit?: number;

  @ApiPropertyOptional({ description: 'Classifier batch size', example: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  classifier_batch_size?: number;

  @ApiPropertyOptional({ description: 'Maximum bytes per classifier batch', example: 26000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  classifier_batch_max_bytes?: number;

  @ApiPropertyOptional({ description: 'Delay between extraction calls in milliseconds', example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  extraction_delay_ms?: number;

  @ApiPropertyOptional({ description: 'LLM calls allowed per minute', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  llm_rate_limit_per_minute?: number;
}