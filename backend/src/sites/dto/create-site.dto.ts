import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SiteType, SiteStatus } from '@prisma/client';

export class CreateSiteDto {
  @ApiProperty({
    description: 'The name of the site',
    example: 'Cairo Assembly Factory',
    maxLength: 180,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(180, { message: 'Name cannot exceed 180 characters' })
  name!: string;

  @ApiProperty({
    description: 'The type of site',
    enum: SiteType,
    example: 'factory',
  })
  @IsEnum(SiteType, { message: 'Invalid site type' })
  type!: SiteType;

  @ApiPropertyOptional({
    description: 'The manager user ID',
    example: '1',
  })
  @IsOptional()
  managerUserId?: string;

  @ApiPropertyOptional({
    description: 'The region of the site',
    example: 'Cairo',
    maxLength: 120,
  })
  @IsString({ message: 'Region must be a string' })
  @IsOptional()
  @MaxLength(120, { message: 'Region cannot exceed 120 characters' })
  region?: string;

  @ApiPropertyOptional({
    description: 'The physical address of the site',
    example: '12 Industrial Zone, Cairo',
    maxLength: 255,
  })
  @IsString({ message: 'Address must be a string' })
  @IsOptional()
  @MaxLength(255, { message: 'Address cannot exceed 255 characters' })
  address?: string;

  @ApiPropertyOptional({
    description: 'The status of the site',
    enum: SiteStatus,
    example: 'active',
  })
  @IsEnum(SiteStatus, { message: 'Invalid site status' })
  @IsOptional()
  status?: SiteStatus;
}
