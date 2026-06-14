import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  monthlyPrice!: string;

  @ApiProperty()
  maxCompanies!: number;

  @ApiProperty()
  maxUsers!: number;

  @ApiPropertyOptional()
  features!: string[];
}
