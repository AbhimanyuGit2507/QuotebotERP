import { IsInt, IsString, Min } from 'class-validator';

export class UploadFileDto {
  @IsString()
  filename!: string;

  @IsString()
  mime_type!: string;

  @IsInt()
  @Min(0)
  size!: number;

  @IsString()
  storage_path!: string;
}
