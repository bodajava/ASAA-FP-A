import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class CreateForecastLineDto {
  @ApiProperty({
    description: 'The Account ID to link this line to',
    example: '1',
  })
  @IsString({ message: 'accountId must be a string representation of ID' })
  @IsNotEmpty({ message: 'accountId is required' })
  accountId!: string;

  @ApiPropertyOptional({
    description: 'Optional Site ID',
    example: '2',
  })
  @IsString({ message: 'siteId must be a string representation of ID' })
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional({
    description: 'Optional Cost Center ID',
    example: '3',
  })
  @IsString({ message: 'costCenterId must be a string representation of ID' })
  @IsOptional()
  costCenterId?: string;

  @ApiPropertyOptional({
    description: 'Optional Product ID',
    example: '4',
  })
  @IsString({ message: 'productId must be a string representation of ID' })
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Optional Material ID',
    example: '5',
  })
  @IsString({ message: 'materialId must be a string representation of ID' })
  @IsOptional()
  materialId?: string;

  @ApiPropertyOptional({
    description: 'Optional Customer ID',
    example: '6',
  })
  @IsString({ message: 'customerId must be a string representation of ID' })
  @IsOptional()
  customerId?: string;

  @ApiProperty({
    description: 'The fiscal period month (1-12)',
    example: 6,
    minimum: 1,
    maximum: 12,
  })
  @IsNumber({}, { message: 'periodMonth must be a number' })
  @Min(1, { message: 'periodMonth must be at least 1' })
  @Max(12, { message: 'periodMonth cannot exceed 12' })
  @IsNotEmpty({ message: 'periodMonth is required' })
  periodMonth!: number;

  @ApiPropertyOptional({
    description: 'Quantity of items',
    example: 100,
  })
  @IsNumber({}, { message: 'quantity must be a number' })
  @Min(0, { message: 'quantity cannot be negative' })
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Price per unit',
    example: 15.5,
  })
  @IsNumber({}, { message: 'unitPrice must be a number' })
  @Min(0, { message: 'unitPrice cannot be negative' })
  @IsOptional()
  unitPrice?: number;

  @ApiProperty({
    description: 'Total amount of this line',
    example: 1550.0,
  })
  @IsNumber({}, { message: 'amount must be a number' })
  @Min(0, { message: 'amount cannot be negative' })
  @IsNotEmpty({ message: 'amount is required' })
  amount!: number;

  @ApiPropertyOptional({
    description: 'Optional Driver Type',
    example: 'headcount',
  })
  @IsString({ message: 'driverType must be a string' })
  @IsOptional()
  driverType?: string;

  @ApiPropertyOptional({
    description: 'Additional notes or explanations',
    example: 'Based on Q2 projections',
  })
  @IsString({ message: 'notes must be a string' })
  @IsOptional()
  notes?: string;
}
