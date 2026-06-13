import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsEmail,
  MaxLength,
  Min,
} from 'class-validator';
import { CustomerType } from '@prisma/client';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'The unique code of the customer',
    example: 'CUST-001',
    maxLength: 80,
  })
  @IsString({ message: 'Code must be a string' })
  @IsNotEmpty({ message: 'Code is required' })
  @MaxLength(80, { message: 'Code cannot exceed 80 characters' })
  code!: string;

  @ApiProperty({
    description: 'The name of the customer',
    example: 'Al Futtaim Group',
    maxLength: 200,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(200, { message: 'Name cannot exceed 200 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'The type of the customer',
    enum: CustomerType,
    example: 'distributor',
  })
  @IsEnum(CustomerType, { message: 'Invalid customer type' })
  @IsOptional()
  customerType?: CustomerType;

  @ApiPropertyOptional({
    description: 'The region of the customer',
    example: 'Middle East',
    maxLength: 120,
  })
  @IsString({ message: 'Region must be a string' })
  @IsOptional()
  @MaxLength(120, { message: 'Region cannot exceed 120 characters' })
  region?: string;

  @ApiPropertyOptional({
    description: 'The contact phone number of the customer',
    example: '+201112223334',
    maxLength: 50,
  })
  @IsString({ message: 'Phone must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Phone cannot exceed 50 characters' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'The contact email address of the customer',
    example: 'finance@alfuttaim.com',
    maxLength: 160,
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsOptional()
  @MaxLength(160, { message: 'Email cannot exceed 160 characters' })
  email?: string;

  @ApiPropertyOptional({
    description: 'The credit limit amount allowed',
    example: 50000.0,
  })
  @IsNumber({}, { message: 'Credit limit must be a number' })
  @Min(0, { message: 'Credit limit cannot be negative' })
  @IsOptional()
  creditLimit?: number;

  @ApiPropertyOptional({
    description: 'The payment term days (e.g. 30, 45, 60)',
    example: 30,
  })
  @IsNumber({}, { message: 'Payment terms must be a number' })
  @Min(0, { message: 'Payment terms cannot be negative' })
  @IsOptional()
  paymentTerms?: number;

  @ApiPropertyOptional({
    description: 'Whether the customer is active',
    default: true,
  })
  @IsBoolean({ message: 'isActive must be a boolean' })
  @IsOptional()
  isActive?: boolean;
}
