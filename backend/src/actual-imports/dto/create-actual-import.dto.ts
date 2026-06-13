import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ImportSourceSystem, ImportType } from '@prisma/client';
import { CreateActualLineDto } from './create-actual-line.dto';

export class CreateActualImportDto {
  @ApiProperty({
    description: 'The source system of this import',
    enum: ImportSourceSystem,
    example: 'excel',
  })
  @IsEnum(ImportSourceSystem, { message: 'Invalid source system' })
  @IsNotEmpty({ message: 'sourceSystem is required' })
  sourceSystem!: ImportSourceSystem;

  @ApiPropertyOptional({
    description: 'The import mapping template ID to apply',
    example: '1',
  })
  @IsString({ message: 'mappingId must be a string representation of ID' })
  @IsOptional()
  mappingId?: string;

  @ApiProperty({
    description: 'The type of data being imported',
    enum: ImportType,
    example: 'sales',
  })
  @IsEnum(ImportType, { message: 'Invalid import type' })
  @IsNotEmpty({ message: 'importType is required' })
  importType!: ImportType;

  @ApiProperty({
    description:
      'The starting date of the import period (ISO 8601 date string)',
    example: '2026-06-01',
  })
  @IsDateString({}, { message: 'periodFrom must be a valid date string' })
  @IsNotEmpty({ message: 'periodFrom is required' })
  periodFrom!: string;

  @ApiProperty({
    description: 'The ending date of the import period (ISO 8601 date string)',
    example: '2026-06-30',
  })
  @IsDateString({}, { message: 'periodTo must be a valid date string' })
  @IsNotEmpty({ message: 'periodTo is required' })
  periodTo!: string;

  @ApiPropertyOptional({
    description: 'The optional file path or URL of the imported file',
    example: '/uploads/actuals-2026-06.xlsx',
  })
  @IsString({ message: 'filePath must be a string' })
  @IsOptional()
  filePath?: string;

  @ApiPropertyOptional({
    description: 'A pre-resolved set of actual lines',
    type: [CreateActualLineDto],
  })
  @IsArray({ message: 'actualLines must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateActualLineDto)
  @IsOptional()
  actualLines?: CreateActualLineDto[];

  @ApiPropertyOptional({
    description: 'Optional raw rows to be parsed using the mapping template',
    example: [{ 'Account Code': '6010', Amount: 5250.0, Date: '2026-06-12' }],
  })
  @IsArray({ message: 'rawRows must be an array' })
  @IsOptional()
  rawRows?: Record<string, string | number | boolean | null>[];
}
