import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PeriodType } from '@prisma/client';
import { CreateBudgetLineDto } from './create-budget-line.dto';

export class CreateBudgetCycleDto {
  @ApiProperty({
    description: 'The name of the budget cycle',
    example: 'Annual Budget FY2026',
    maxLength: 160,
  })
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(160, { message: 'name cannot exceed 160 characters' })
  name!: string;

  @ApiProperty({
    description: 'The fiscal year for the budget',
    example: 2026,
  })
  @IsNumber({}, { message: 'fiscalYear must be a number' })
  @IsNotEmpty({ message: 'fiscalYear is required' })
  fiscalYear!: number;

  @ApiProperty({
    description: 'The period type of the budget cycle',
    enum: PeriodType,
    example: 'annual',
  })
  @IsEnum(PeriodType, { message: 'Invalid period type' })
  @IsNotEmpty({ message: 'periodType is required' })
  periodType!: PeriodType;

  @ApiPropertyOptional({
    description: 'The version number of the budget cycle',
    example: 1,
    default: 1,
  })
  @IsNumber({}, { message: 'version must be a number' })
  @IsOptional()
  version?: number;

  @ApiPropertyOptional({
    description: 'The budget lines for this cycle',
    type: [CreateBudgetLineDto],
  })
  @IsArray({ message: 'budgetLines must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetLineDto)
  @IsOptional()
  budgetLines?: CreateBudgetLineDto[];
}
