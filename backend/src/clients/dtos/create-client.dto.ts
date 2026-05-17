import { IsEmail, IsIn, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name!: string;

  @IsIn(['B2B', 'B2C'])
  type!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  gst?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsIn(['new', 'regular', 'top'])
  tier?: string;
}
