import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address', example: 'user@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Full name', example: 'Jane Doe' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Password (min 8 characters)', example: 'SecureP@ss123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ description: 'User role', example: 'user', enum: ['admin', 'manager', 'user'] })
  @IsOptional()
  @IsIn(['admin', 'manager', 'user'])
  role?: string;

  @ApiPropertyOptional({ description: 'Account status', example: 'active', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
