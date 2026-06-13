import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsEnum } from 'class-validator';
import { ConnectionType } from '@prisma/client';

export class TestConnectionDto {
  @ApiPropertyOptional({
    description: 'ID of an existing connection to test',
    example: '1',
  })
  @IsString()
  @IsOptional()
  connectionId?: string;

  @ApiPropertyOptional({
    description: 'Connection name',
    example: 'Test Connection',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Type of connection',
    enum: ConnectionType,
    example: 'rest_api',
  })
  @IsEnum(ConnectionType)
  @IsOptional()
  connectionType?: ConnectionType;

  @ApiPropertyOptional({ description: 'Host address', example: 'localhost' })
  @IsString()
  @IsOptional()
  host?: string;

  @ApiPropertyOptional({ description: 'Port number', example: 80 })
  @IsInt()
  @IsOptional()
  port?: number;

  @ApiPropertyOptional({ description: 'Database name', example: 'db_name' })
  @IsString()
  @IsOptional()
  databaseName?: string;

  @ApiPropertyOptional({ description: 'Username', example: 'username' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ description: 'Unencrypted password' })
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

  @ApiPropertyOptional({ description: 'Unencrypted API Key' })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({
    description: 'Extra JSON configuration',
    example: { ssl: true },
  })
  @IsOptional()
  extraConfig?: Record<string, string | number | boolean | null>;
}
