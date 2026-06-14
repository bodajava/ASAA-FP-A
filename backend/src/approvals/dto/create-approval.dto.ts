import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApprovalDto {
  @ApiProperty({ description: 'Entity type (e.g. BudgetCycle, ForecastCycle)' })
  @IsString()
  entityType!: string;

  @ApiProperty({ description: 'Entity ID' })
  @IsString()
  entityId!: string;

  @ApiPropertyOptional({ description: 'Step order for multi-level approval' })
  @IsOptional()
  @IsInt()
  @Min(1)
  stepOrder?: number;

  @ApiPropertyOptional({ description: 'Comments' })
  @IsOptional()
  @IsString()
  comments?: string;
}
