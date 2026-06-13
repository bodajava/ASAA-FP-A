import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class SalesPlanLineDto {
  @ApiProperty({ description: 'Product ID to include in the sales plan' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ description: 'Sales quantity for this product' })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class ExplodeSalesPlanDto {
  @ApiProperty({
    type: [SalesPlanLineDto],
    description: 'List of product sales plan lines for BOM explosion',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesPlanLineDto)
  salesPlanLines!: SalesPlanLineDto[];
}
