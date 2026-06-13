import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({
    description: 'The name of the supplier',
    example: 'Global Logistics Trading',
    maxLength: 200,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(200, { message: 'Name cannot exceed 200 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'The contact phone number of the supplier',
    example: '+201234567890',
    maxLength: 50,
  })
  @IsString({ message: 'Phone must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Phone cannot exceed 50 characters' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'The contact email address of the supplier',
    example: 'contact@globallogistics.com',
    maxLength: 160,
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsOptional()
  @MaxLength(160, { message: 'Email cannot exceed 160 characters' })
  email?: string;
}
