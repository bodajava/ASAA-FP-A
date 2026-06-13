import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray } from 'class-validator';

export class PreviewActualImportDto {
  @ApiProperty({
    description: 'The Import Mapping template ID to apply',
    example: '1',
  })
  @IsString({ message: 'mappingId must be a string representation of ID' })
  @IsNotEmpty({ message: 'mappingId is required' })
  mappingId!: string;

  @ApiProperty({
    description: 'The raw spreadsheet or database rows to map',
    example: [{ 'Account Code': '6010', Amount: 5250.0, Date: '2026-06-12' }],
  })
  @IsArray({ message: 'rawRows must be an array' })
  @IsNotEmpty({ message: 'rawRows is required' })
  rawRows!: Record<string, string | number | boolean | null>[];
}
