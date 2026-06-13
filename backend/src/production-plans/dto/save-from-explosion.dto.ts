import {
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductionPlanItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  plannedQty!: number;

  @IsNumber()
  estimatedCost!: number;
}

export class SaveFromExplosionDto {
  @IsString()
  siteId!: string;

  @IsInt()
  @Min(2000)
  fiscalYear!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionPlanItemDto)
  items!: ProductionPlanItemDto[];
}
