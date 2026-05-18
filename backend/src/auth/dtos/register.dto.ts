import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Tenant ID to register under', example: 'tenant_abc123' })
  @IsString({ message: 'Tenant ID must be a string' })
  tenant_id!: string;

  @ApiProperty({ description: 'User email address', example: 'newuser@company.com' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

  @ApiProperty({ description: 'Full name of the user', example: 'John Doe' })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name!: string;

  @ApiProperty({ description: 'Password (min 8 characters)', example: 'SecureP@ss123' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;
}
