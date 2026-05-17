import { IsUrl } from 'class-validator';

export class UploadProductImageDto {
  @IsUrl()
  image_url!: string;
}
