import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export enum KpiCategory {
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  SALES = 'sales',
  PRODUCTION = 'production',
  HR = 'hr',
}

export class CreateKpiTargetDto {
  @IsInt()
  @IsOptional()
  siteId?: number;

  @IsString()
  kpiName!: string;

  @IsEnum(KpiCategory)
  @IsOptional()
  kpiCategory?: KpiCategory;

  @IsInt()
  fiscalYear!: number;

  @IsInt()
  @IsOptional()
  periodMonth?: number;

  @IsNumber()
  targetValue!: number;

  @IsString()
  @IsOptional()
  unit?: string;
}
