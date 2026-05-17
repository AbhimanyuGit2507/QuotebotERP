import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  new_rfq?: boolean;

  @IsOptional()
  @IsBoolean()
  quote_sent?: boolean;

  @IsOptional()
  @IsBoolean()
  quote_viewed?: boolean;

  @IsOptional()
  @IsBoolean()
  quote_accepted?: boolean;

  @IsOptional()
  @IsBoolean()
  quote_declined?: boolean;
}
