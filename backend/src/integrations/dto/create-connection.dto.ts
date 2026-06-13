import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ConnectionType, SyncSchedule } from '@prisma/client';

export class CreateConnectionDto {
  @ApiProperty({
    description: 'Connection name',
    example: 'Oracle HR Connection',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Type of connection',
    enum: ConnectionType,
    example: 'oracle',
  })
  @IsEnum(ConnectionType)
  @IsNotEmpty()
  connectionType!: ConnectionType;

  @ApiPropertyOptional({ description: 'Host address', example: 'localhost' })
  @IsString()
  @IsOptional()
  host?: string;

  @ApiPropertyOptional({ description: 'Port number', example: 1521 })
  @IsInt()
  @IsOptional()
  port?: number;

  @ApiPropertyOptional({ description: 'Database name', example: 'XE' })
  @IsString()
  @IsOptional()
  databaseName?: string;

  @ApiPropertyOptional({ description: 'Username', example: 'system' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({
    description: 'Unencrypted password to be stored encrypted',
  })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    description: 'API Base URL',
    example: 'https://api.example.com/v1',
  })
  @IsString()
  @IsOptional()
  apiBaseUrl?: string;

  @ApiPropertyOptional({
    description: 'Unencrypted API Key to be stored encrypted',
  })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({
    description: 'Extra JSON configuration',
    example: { ssl: true },
  })
  @IsOptional()
  extraConfig?: Record<string, string | number | boolean | null>;

  @ApiPropertyOptional({
    description: 'Sync schedule',
    enum: SyncSchedule,
    default: SyncSchedule.manual,
  })
  @IsEnum(SyncSchedule)
  @IsOptional()
  syncSchedule?: SyncSchedule;

  @ApiPropertyOptional({
    description: 'Whether connection is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
