import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePromotionDto {
  @ApiProperty({
    description: 'Promotion name',
    example: 'Summer Sale 2026',
    maxLength: 160,
  })
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(160, { message: 'name cannot exceed 160 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Promotion description',
    example: '20% off on all summer collection items',
  })
  @IsString({ message: 'description must be a string' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Product ID (string representation) this promotion applies to',
    example: '1',
  })
  @IsString({ message: 'productId must be a string representation of ID' })
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Customer ID (string representation) this promotion targets',
    example: '1',
  })
  @IsString({ message: 'customerId must be a string representation of ID' })
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Discount percentage (e.g. 15.500 for 15.5%)',
    example: 15.5,
  })
  @IsNumber({}, { message: 'discountPct must be a number' })
  @Min(0, { message: 'discountPct cannot be negative' })
  @IsOptional()
  discountPct?: number;

  @ApiPropertyOptional({
    description: 'Discount flat amount',
    example: 500.0,
  })
  @IsNumber({}, { message: 'discountAmt must be a number' })
  @Min(0, { message: 'discountAmt cannot be negative' })
  @IsOptional()
  discountAmt?: number;

  @ApiProperty({
    description: 'Promotion start date',
    example: '2026-06-01',
  })
  @Type(() => Date)
  @IsNotEmpty({ message: 'startDate is required' })
  startDate!: Date;

  @ApiPropertyOptional({
    description: 'Promotion end date',
    example: '2026-08-31',
  })
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Budgeted amount for the promotion',
    example: 10000.0,
    default: 0,
  })
  @IsNumber({}, { message: 'budgetAmt must be a number' })
  @Min(0, { message: 'budgetAmt cannot be negative' })
  @IsOptional()
  budgetAmt?: number;

  @ApiPropertyOptional({
    description: 'Actual cost incurred',
    example: 8500.0,
    default: 0,
  })
  @IsNumber({}, { message: 'actualCost must be a number' })
  @Min(0, { message: 'actualCost cannot be negative' })
  @IsOptional()
  actualCost?: number;

  @ApiPropertyOptional({
    description: 'Incremental revenue attributed to the promotion',
    example: 25000.0,
    default: 0,
  })
  @IsNumber({}, { message: 'incrementalRevenue must be a number' })
  @Min(0, { message: 'incrementalRevenue cannot be negative' })
  @IsOptional()
  incrementalRevenue?: number;

  @ApiPropertyOptional({
    description: 'Whether the promotion is active',
    default: true,
  })
  @IsBoolean({ message: 'isActive must be a boolean' })
  @IsOptional()
  isActive?: boolean;
}
