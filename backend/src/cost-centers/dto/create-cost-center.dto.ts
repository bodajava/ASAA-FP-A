import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CostCenterType } from '@prisma/client';

export class CreateCostCenterDto {
  @ApiProperty({
    description: 'The name of the cost center',
    example: 'Marketing Department',
    maxLength: 160,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(160, { message: 'Name cannot exceed 160 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'The unique code of the cost center',
    example: 'CC-MKT',
    maxLength: 60,
  })
  @IsString({ message: 'Code must be a string' })
  @IsOptional()
  @MaxLength(60, { message: 'Code cannot exceed 60 characters' })
  code?: string;

  @ApiPropertyOptional({
    description: 'The type of cost center',
    enum: CostCenterType,
    example: 'marketing',
  })
  @IsEnum(CostCenterType, { message: 'Invalid cost center type' })
  @IsOptional()
  type?: CostCenterType;

  @ApiPropertyOptional({
    description: 'The associated site ID',
    example: '5',
  })
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional({
    description: 'The parent cost center ID for hierarchy',
    example: '2',
  })
  @IsOptional()
  parentId?: string;
}
