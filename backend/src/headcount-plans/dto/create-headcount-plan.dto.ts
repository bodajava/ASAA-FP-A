import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  SEASONAL = 'seasonal',
}

export class CreateHeadcountPlanDto {
  @Type(() => Number)
  @IsInt()
  budgetCycleId!: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  siteId?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  costCenterId?: number;

  @IsString()
  jobTitle!: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @IsInt()
  @Min(1)
  @IsOptional()
  headcount?: number;

  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @IsNumber()
  @Min(0)
  basicSalary!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  allowances?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  socialInsurance?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
