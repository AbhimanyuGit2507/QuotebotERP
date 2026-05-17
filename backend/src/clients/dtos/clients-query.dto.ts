import { IsIn, IsOptional, IsString } from 'class-validator';

export class ClientsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['gold', 'silver', 'bronze', 'regular', 'vip', 'new'])
  tier?: string;
}
