import { IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  template_key!: string;

  @IsString()
  content!: string;
}
