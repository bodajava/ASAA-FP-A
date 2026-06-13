import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScenarioAssumptionsDto } from './scenario-assumptions.dto';

export enum BaseCycleType {
  BUDGET = 'budget',
  FORECAST = 'forecast',
}

export class PreviewSimulationDto {
  @ApiProperty({
    description: 'The type of the baseline cycle data to simulate on',
    enum: BaseCycleType,
    example: 'forecast',
  })
  @IsEnum(BaseCycleType, { message: 'baseType must be budget or forecast' })
  @IsNotEmpty({ message: 'baseType is required' })
  baseType!: BaseCycleType;

  @ApiProperty({
    description: 'The ID of the baseline budget or forecast cycle',
    example: '1',
  })
  @IsString({ message: 'baseId must be a string representation of ID' })
  @IsNotEmpty({ message: 'baseId is required' })
  baseId!: string;

  @ApiPropertyOptional({
    description: 'Optional ID of a saved Scenario to run the simulation with',
    example: '1',
  })
  @IsString({ message: 'scenarioId must be a string representation of ID' })
  @IsOptional()
  scenarioId?: string;

  @ApiPropertyOptional({
    description:
      'Optional temporary assumptions to override/run direct ad-hoc simulation',
    type: ScenarioAssumptionsDto,
  })
  @ValidateNested()
  @Type(() => ScenarioAssumptionsDto)
  @IsOptional()
  overrideAssumptions?: ScenarioAssumptionsDto;
}
