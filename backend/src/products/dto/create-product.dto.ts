import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductType } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({
    description: 'The unique Stock Keeping Unit (SKU) of the product',
    example: 'PROD-FG-001',
    maxLength: 80,
  })
  @IsString({ message: 'SKU must be a string' })
  @IsNotEmpty({ message: 'SKU is required' })
  @MaxLength(80, { message: 'SKU cannot exceed 80 characters' })
  sku!: string;

  @ApiProperty({
    description: 'The name of the product',
    example: 'Premium Canned Tuna',
    maxLength: 200,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(200, { message: 'Name cannot exceed 200 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'The category ID of the product',
    example: '3',
  })
  @IsString({ message: 'categoryId must be a string representation of ID' })
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'The unit of measurement ID',
    example: '2',
  })
  @IsString({ message: 'unitId must be a string representation of ID' })
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional({
    description: 'The type of the product',
    enum: ProductType,
    example: 'finished_good',
  })
  @IsEnum(ProductType, { message: 'Invalid product type' })
  @IsOptional()
  productType?: ProductType;

  @ApiPropertyOptional({
    description: 'The sale price of the product',
    example: 49.99,
  })
  @IsNumber({}, { message: 'Sale price must be a number' })
  @Min(0, { message: 'Sale price cannot be negative' })
  @IsOptional()
  salePrice?: number;

  @ApiPropertyOptional({
    description: 'The standard cost of the product',
    example: 30.0,
  })
  @IsNumber({}, { message: 'Standard cost must be a number' })
  @Min(0, { message: 'Standard cost cannot be negative' })
  @IsOptional()
  standardCost?: number;

  @ApiPropertyOptional({
    description: 'Whether the product is active',
    default: true,
  })
  @IsBoolean({ message: 'isActive must be a boolean' })
  @IsOptional()
  isActive?: boolean;
}
