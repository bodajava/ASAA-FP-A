import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateProductCategoryDto {
  @ApiProperty({
    description: 'The name of the product category',
    example: 'Raw Ingredients',
    maxLength: 160,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(160, { message: 'Name cannot exceed 160 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'The parent category ID for nested subcategories',
    example: '3',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'parentId must be a numeric string' })
  parentId?: string;
}
