import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { PlanSource } from '@prisma/client';

export class CreateProductionPlanDto {
  @IsString()
  siteId!: string;

  @IsString()
  productId!: string;

  @IsOptional()
  @IsEnum(PlanSource)
  planSource?: PlanSource;

  @IsInt()
  @Min(2000)
  fiscalYear!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @IsNumber()
  plannedQty!: number;

  @IsOptional()
  @IsNumber()
  actualQty?: number;

  @IsOptional()
  @IsNumber()
  estimatedCost?: number;

  @IsOptional()
  @IsNumber()
  actualCost?: number;
}
