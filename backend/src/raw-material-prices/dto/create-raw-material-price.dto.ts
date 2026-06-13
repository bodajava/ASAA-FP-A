import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateRawMaterialPriceDto {
  @ApiProperty({
    description: 'The ID of the material',
    example: '5',
  })
  @IsString({ message: 'materialId must be a string representation of ID' })
  @IsNotEmpty({ message: 'materialId is required' })
  materialId!: string;

  @ApiProperty({
    description: 'The price of the material',
    example: 1250.5,
  })
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price cannot be negative' })
  price!: number;

  @ApiProperty({
    description: 'The date of the price (YYYY-MM-DD)',
    example: '2025-06-01',
  })
  @IsDateString({}, { message: 'priceDate must be a valid date string' })
  priceDate!: string;

  @ApiPropertyOptional({
    description: 'Source of the price entry',
    example: 'manual',
    default: 'manual',
  })
  @IsString({ message: 'Source must be a string' })
  @IsOptional()
  source?: string;
}
