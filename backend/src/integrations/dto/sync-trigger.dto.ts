import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
} from 'class-validator';

export class SyncTriggerDto {
  @ApiProperty({
    description: 'ID of the mapping template to trigger sync with',
    example: '1',
  })
  @IsString()
  @IsNotEmpty()
  mappingId!: string;

  @ApiPropertyOptional({
    description: 'Optional ID of the connection to override mapped connection',
    example: '2',
  })
  @IsString()
  @IsOptional()
  connectionId?: string;

  @ApiPropertyOptional({
    description: 'Starting date of the synchronization period',
    example: '2026-06-01',
  })
  @IsDateString()
  @IsOptional()
  periodFrom?: string;

  @ApiPropertyOptional({
    description: 'Ending date of the synchronization period',
    example: '2026-06-30',
  })
  @IsDateString()
  @IsOptional()
  periodTo?: string;

  @ApiPropertyOptional({
    description: 'Starting date (alias for periodFrom, used by frontend)',
    example: '2026-06-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Ending date (alias for periodTo, used by frontend)',
    example: '2026-06-30',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description:
      'Optional manual data rows to sync (overrides external fetching)',
    example: [{ 'Account Code': '6010', Amount: 5000.0, Date: '2026-06-15' }],
  })
  @IsArray()
  @IsOptional()
  rawRows?: Record<string, string | number | boolean | null>[];
}
