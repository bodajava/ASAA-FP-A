import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  MaxLength,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ForecastMethod } from '@prisma/client';
import { CreateForecastLineDto } from './create-forecast-line.dto';

export class CreateForecastCycleDto {
  @ApiProperty({
    description: 'The name of the forecast cycle',
    example: 'Q3 Rolling Forecast 2026',
    maxLength: 160,
  })
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(160, { message: 'name cannot exceed 160 characters' })
  name!: string;

  @ApiProperty({
    description: 'The fiscal year for the forecast',
    example: 2026,
  })
  @IsNumber({}, { message: 'fiscalYear must be a number' })
  @IsNotEmpty({ message: 'fiscalYear is required' })
  fiscalYear!: number;

  @ApiProperty({
    description:
      'The starting base period for the forecast (ISO 8601 date string)',
    example: '2026-07-01',
  })
  @IsDateString({}, { message: 'basePeriod must be a valid date string' })
  @IsNotEmpty({ message: 'basePeriod is required' })
  basePeriod!: string;

  @ApiPropertyOptional({
    description: 'The forecast method being used',
    enum: ForecastMethod,
    example: 'manual',
    default: 'manual',
  })
  @IsEnum(ForecastMethod, { message: 'Invalid forecast method' })
  @IsOptional()
  method?: ForecastMethod;

  @ApiPropertyOptional({
    description: 'Optional Scenario ID to link this forecast to',
    example: '1',
  })
  @IsString({ message: 'scenarioId must be a string representation of ID' })
  @IsOptional()
  scenarioId?: string;

  @ApiPropertyOptional({
    description: 'The forecast lines for this cycle',
    type: [CreateForecastLineDto],
  })
  @IsArray({ message: 'forecastLines must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateForecastLineDto)
  @IsOptional()
  forecastLines?: CreateForecastLineDto[];
}
