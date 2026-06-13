import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IndustryType } from '@prisma/client';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'The name of the company',
    example: 'Acme Manufacturing',
    maxLength: 200,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(200, { message: 'Name cannot exceed 200 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'The legal registered name of the company',
    example: 'Acme Food Industries LLC',
    maxLength: 220,
  })
  @IsString({ message: 'Legal name must be a string' })
  @IsOptional()
  @MaxLength(220, { message: 'Legal name cannot exceed 220 characters' })
  legalName?: string;

  @ApiPropertyOptional({
    description: 'The primary industry type of the company',
    enum: IndustryType,
    example: 'mixed',
  })
  @IsEnum(IndustryType, { message: 'Invalid industry type' })
  @IsOptional()
  industryType?: IndustryType;

  @ApiPropertyOptional({
    description: 'The 3-letter currency code',
    example: 'EGP',
    maxLength: 3,
  })
  @IsString({ message: 'Currency code must be a string' })
  @IsOptional()
  @MaxLength(3, { message: 'Currency code must be 3 characters long' })
  currencyCode?: string;

  @ApiPropertyOptional({
    description: 'The 3-letter currency code (alternate)',
    example: 'EGP',
  })
  @IsString({ message: 'Currency must be a string' })
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'The start month of the fiscal year (1-12)',
    example: 1,
    minimum: 1,
    maximum: 12,
  })
  @IsInt({ message: 'Fiscal year start month must be an integer' })
  @Min(1, { message: 'Month must be at least 1' })
  @Max(12, { message: 'Month cannot exceed 12' })
  @IsOptional()
  fiscalYearStartMonth?: number;

  @ApiPropertyOptional({
    description: 'The start month of the fiscal year (alternate)',
    example: 1,
    minimum: 1,
    maximum: 12,
  })
  @IsInt({ message: 'Fiscal year start must be an integer' })
  @Min(1, { message: 'Fiscal year start must be at least 1' })
  @Max(12, { message: 'Fiscal year start cannot exceed 12' })
  @IsOptional()
  fiscalYearStart?: number;

  @ApiPropertyOptional({
    description: 'The tax identification number of the company',
    example: '123-456-789',
    maxLength: 80,
  })
  @IsString({ message: 'Tax number must be a string' })
  @IsOptional()
  @MaxLength(80, { message: 'Tax number cannot exceed 80 characters' })
  taxNumber?: string;

  @ApiPropertyOptional({
    description: 'The company code (optional)',
    example: 'ACME',
  })
  @IsString({ message: 'Company code must be a string' })
  @IsOptional()
  code?: string;
}
