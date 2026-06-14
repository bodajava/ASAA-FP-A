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
  monthlyPrice!: number;

  @ApiProperty()
  yearlyPrice!: number;

  @ApiProperty()
  maxCompanies!: number;

  @ApiProperty()
  maxUsers!: number;

  @ApiProperty()
  maxBranches!: number;

  @ApiProperty()
  dashboardLevel!: string;

  @ApiPropertyOptional()
  features!: string[];

  @ApiPropertyOptional()
  restrictions!: string[];

  @ApiPropertyOptional()
  suitableFor!: string[];

  @ApiProperty()
  isActive!: boolean;
}
