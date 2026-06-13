import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MaterialRef {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;
}

export class RawMaterialPriceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  materialId!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  priceDate!: Date;

  @ApiPropertyOptional({ nullable: true })
  source!: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt!: Date | null;

  @ApiPropertyOptional({ type: MaterialRef, nullable: true })
  material?: MaterialRef | null;
}
