import { IsOptional, IsString } from 'class-validator';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  template_key?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
