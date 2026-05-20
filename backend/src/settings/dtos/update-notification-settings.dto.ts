import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Notify on new RFQ', example: true })
  @IsOptional()
  @IsBoolean()
  new_rfq?: boolean;

  @ApiPropertyOptional({
    description: 'Notify when quote is sent',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  quote_sent?: boolean;

  @ApiPropertyOptional({
    description: 'Notify when quote is viewed',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  quote_viewed?: boolean;

  @ApiPropertyOptional({
    description: 'Notify when quote is accepted',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  quote_accepted?: boolean;

  @ApiPropertyOptional({
    description: 'Notify when quote is declined',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  quote_declined?: boolean;
}
