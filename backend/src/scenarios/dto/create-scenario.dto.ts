import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScenarioType } from '@prisma/client';
import { ScenarioAssumptionsDto } from './scenario-assumptions.dto';

export class CreateScenarioDto {
  @ApiProperty({
    description: 'The name of the scenario planning model',
    example: 'Material Price Spike 2026',
    maxLength: 160,
  })
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(160, { message: 'name cannot exceed 160 characters' })
  name!: string;

  @ApiProperty({
    description:
      'The core scenario type (base, optimistic, pessimistic, custom)',
    enum: ScenarioType,
    example: 'custom',
  })
  @IsEnum(ScenarioType, { message: 'Invalid scenario type' })
  @IsNotEmpty({ message: 'scenarioType is required' })
  scenarioType!: ScenarioType;

  @ApiProperty({
    description: 'Detailed scenario simulation assumptions',
    type: ScenarioAssumptionsDto,
  })
  @ValidateNested()
  @Type(() => ScenarioAssumptionsDto)
  @IsNotEmpty({ message: 'assumptions is required' })
  assumptions!: ScenarioAssumptionsDto;
}
