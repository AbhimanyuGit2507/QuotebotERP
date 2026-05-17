import { IsIn } from 'class-validator';

export class UpdateClientTierDto {
  @IsIn(['new', 'regular', 'top'])
  tier!: string;
}
