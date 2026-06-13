import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserStatus } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    description: 'The full name of the user',
    example: 'Ahmed Ali',
    maxLength: 160,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(160, { message: 'Name cannot exceed 160 characters' })
  name!: string;

  @ApiProperty({
    description: 'The email address of the user (unique per tenant)',
    example: 'ahmed.ali@example.com',
    maxLength: 160,
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(160, { message: 'Email cannot exceed 160 characters' })
  email!: string;

  @ApiPropertyOptional({
    description: 'The phone number of the user',
    example: '+201234567890',
    maxLength: 50,
  })
  @IsString({ message: 'Phone must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Phone cannot exceed 50 characters' })
  phone?: string;

  @ApiProperty({
    description: 'The plain-text password (will be hashed before storing)',
    example: 'P@ssw0rd!',
    minLength: 6,
    maxLength: 255,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(255, { message: 'Password cannot exceed 255 characters' })
  password!: string;

  @ApiPropertyOptional({
    description: 'The role ID to assign to the user',
    example: 1,
  })
  @IsOptional()
  roleId?: bigint;

  @ApiPropertyOptional({
    description: 'The status of the user account',
    enum: UserStatus,
    default: 'active',
  })
  @IsEnum(UserStatus, { message: 'Invalid user status' })
  @IsOptional()
  status?: UserStatus;
}
