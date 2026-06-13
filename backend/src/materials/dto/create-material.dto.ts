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

export class CreateMaterialDto {
  @ApiProperty({
    description: 'The unique code of the material',
    example: 'MAT-RAW-001',
    maxLength: 80,
  })
  @IsString({ message: 'Code must be a string' })
  @IsNotEmpty({ message: 'Code is required' })
  @MaxLength(80, { message: 'Code cannot exceed 80 characters' })
  code!: string;

  @ApiProperty({
    description: 'The name of the material',
    example: 'Raw Tuna Fish',
    maxLength: 200,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(200, { message: 'Name cannot exceed 200 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'The supplier ID of the material',
    example: '4',
  })
  @IsString({ message: 'supplierId must be a string representation of ID' })
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'The unit of measurement ID',
    example: '2',
  })
  @IsString({ message: 'unitId must be a string representation of ID' })
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional({
    description: 'The purchase price of the material',
    example: 15.5,
  })
  @IsNumber({}, { message: 'Purchase price must be a number' })
  @Min(0, { message: 'Purchase price cannot be negative' })
  @IsOptional()
  purchasePrice?: number;

  @ApiPropertyOptional({
    description: 'The safety stock quantity required',
    example: 100.0,
  })
  @IsNumber({}, { message: 'Safety stock quantity must be a number' })
  @Min(0, { message: 'Safety stock quantity cannot be negative' })
  @IsOptional()
  safetyStockQty?: number;

  @ApiPropertyOptional({
    description: 'Whether the material is active',
    default: true,
  })
  @IsBoolean({ message: 'isActive must be a boolean' })
  @IsOptional()
  isActive?: boolean;
}
