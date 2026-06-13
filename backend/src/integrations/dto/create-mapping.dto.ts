import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ImportSourceSystem, ImportType } from '@prisma/client';

export class CreateMappingDto {
  @ApiPropertyOptional({
    description: 'ID of the associated connection',
    example: '1',
  })
  @IsString()
  @IsOptional()
  connectionId?: string;

  @ApiProperty({
    description: 'Mapping template name',
    example: 'Standard Sales Mapping',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Import source system',
    enum: ImportSourceSystem,
    example: 'excel',
  })
  @IsEnum(ImportSourceSystem)
  @IsNotEmpty()
  sourceSystem!: ImportSourceSystem;

  @ApiProperty({
    description: 'Type of data being imported',
    enum: ImportType,
    example: 'sales',
  })
  @IsEnum(ImportType)
  @IsNotEmpty()
  importType!: ImportType;

  @ApiProperty({
    description:
      'JSON configuration mapping logical fields to source system column headers',
    example: {
      accountCode: 'GL Account',
      amount: 'Amount',
      transactionDate: 'Post Date',
      quantity: 'Qty',
      unitPrice: 'Price',
      referenceNo: 'Ref Number',
    },
  })
  @IsObject()
  @IsNotEmpty()
  mappingConfig!: Record<string, string | null>;

  @ApiPropertyOptional({
    description: 'Skip rows with errors during import',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  skipErrors?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this is the default mapping for the source and type',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Whether mapping is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
