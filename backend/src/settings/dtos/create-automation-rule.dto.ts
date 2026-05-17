import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateAutomationRuleDto {
  @IsString()
  name!: string;

  @IsString()
  condition!: string;

  @IsString()
  action!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
