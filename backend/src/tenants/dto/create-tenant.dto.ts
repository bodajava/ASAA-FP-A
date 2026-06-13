import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TenantStatus } from '@prisma/client';

export class CreateTenantDto {
  @ApiProperty({
    description: 'The name of the tenant account',
    example: 'Acme Corporation',
    maxLength: 180,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(180, { message: 'Name cannot exceed 180 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'The URL slug for the tenant',
    example: 'acme',
    maxLength: 120,
  })
  @IsString({ message: 'Slug must be a string' })
  @IsOptional()
  @MaxLength(120, { message: 'Slug cannot exceed 120 characters' })
  slug?: string;

  @ApiPropertyOptional({
    description: 'The status of the tenant account',
    enum: TenantStatus,
    example: 'trial',
  })
  @IsEnum(TenantStatus, { message: 'Invalid tenant status' })
  @IsOptional()
  status?: TenantStatus;

  @ApiPropertyOptional({
    description: 'The plan ID associated with this tenant',
    example: '1',
  })
  @IsOptional()
  planId?: string | number;

  @ApiPropertyOptional({
    description: 'The date when the trial period ends',
    example: '2026-12-31',
  })
  @IsString({ message: 'Trial ends at must be a valid date string' })
  @IsOptional()
  trialEndsAt?: string;
}
