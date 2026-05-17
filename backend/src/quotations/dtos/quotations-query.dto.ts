import { IsIn, IsOptional, IsString } from 'class-validator';

export class QuotationsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['draft', 'sent', 'accepted', 'declined'])
  status?: string;
}
