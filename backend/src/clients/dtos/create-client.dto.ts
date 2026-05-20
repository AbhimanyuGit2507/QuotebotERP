import { IsEmail, IsIn, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({
    description: 'Client company or individual name',
    example: 'Acme Corp',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Client type',
    example: 'B2B',
    enum: ['B2B', 'B2C'],
  })
  @IsIn(['B2B', 'B2C'])
  type!: string;

  @ApiProperty({
    description: 'Client email address',
    example: 'contact@acme.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+91 9876543210',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://acme.com',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Street address',
    example: '123 MG Road',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Mumbai' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State', example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'GST number',
    example: '27AABCU9603R1ZM',
  })
  @IsOptional()
  @IsString()
  gst?: string;

  @ApiPropertyOptional({ description: 'PAN number', example: 'AABCU9603R' })
  @IsOptional()
  @IsString()
  pan?: string;

  @ApiPropertyOptional({
    description: 'Client tier',
    example: 'regular',
    enum: ['new', 'regular', 'top'],
  })
  @IsOptional()
  @IsIn(['new', 'regular', 'top'])
  tier?: string;
}
