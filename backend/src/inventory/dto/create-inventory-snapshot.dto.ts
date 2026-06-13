import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateInventorySnapshotDto {
  @IsString()
  siteId!: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsDateString()
  snapshotDate!: string;

  @IsNumber()
  qtyOnHand!: number;

  @IsNumber()
  inventoryValue!: number;
}
