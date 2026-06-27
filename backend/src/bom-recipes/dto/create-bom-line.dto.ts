import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateBomLineDto {
  @ApiProperty({
    description: 'The material ID',
    example: '1',
  })
  @IsString({ message: 'materialId must be a string representation of ID' })
  @IsNotEmpty({ message: 'materialId is required' })
  materialId!: string;

  @ApiProperty({
    description: 'Quantity of material required per recipe output quantity',
    example: 2.5,
  })
  @IsNumber({}, { message: 'qtyPerOutput must be a number' })
  @Min(0, { message: 'qtyPerOutput cannot be negative' })
  qtyPerOutput!: number;

  @ApiPropertyOptional({
    description:
      'Optional custom unit cost. If not provided, defaults to the material purchase price.',
    example: 12.0,
  })
  @IsNumber({}, { message: 'unitCost must be a number' })
  @Min(0, { message: 'unitCost cannot be negative' })
  @IsOptional()
  unitCost?: number;

  @ApiPropertyOptional({
    description:
      'Wastage percentage for this specific material line (e.g. 5.0 for 5%)',
    example: 5.0,
  })
  @IsNumber({}, { message: 'wastagePct must be a number' })
  @Min(0, { message: 'wastagePct cannot be negative' })
  @IsOptional()
  wastagePct?: number;

  @ApiPropertyOptional({
    description:
      'Yield percentage for this specific material line (e.g. 95.0 for 95%)',
    example: 95.0,
  })
  @IsNumber({}, { message: 'yieldPct must be a number' })
  @Min(0, { message: 'yieldPct cannot be negative' })
  @IsOptional()
  yieldPct?: number;

  @ApiPropertyOptional({
    description:
      'Cost category for this specific material line (e.g. Raw Material, Packaging)',
    example: 'Raw Material',
  })
  @IsString({ message: 'costCategory must be a string' })
  @IsOptional()
  costCategory?: string;
}
