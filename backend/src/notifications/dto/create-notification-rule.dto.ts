import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { TriggerType } from '@prisma/client';

export class CreateNotificationRuleDto {
  @ApiProperty({ description: 'Rule name', example: 'Variance Alert > 10%' })
  @IsString()
  @IsNotEmpty()
  ruleName!: string;

  @ApiProperty({
    description: 'Trigger type',
    enum: TriggerType,
    example: 'variance_pct',
  })
  @IsEnum(TriggerType)
  @IsNotEmpty()
  triggerType!: TriggerType;

  @ApiPropertyOptional({
    description: 'Threshold value for variance/KPI breach',
    example: 10.0,
  })
  @IsNumber()
  @IsOptional()
  thresholdValue?: number;

  @ApiPropertyOptional({ description: 'Target account ID', example: '1' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Target site ID', example: '1' })
  @IsString()
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional({
    description: 'JSON array of roles to notify',
    example: ['admin'],
  })
  @IsArray()
  @IsOptional()
  notifyRoles?: string[];

  @ApiPropertyOptional({
    description: 'JSON array of user IDs to notify',
    example: ['1', '2'],
  })
  @IsArray()
  @IsOptional()
  notifyUsers?: string[];

  @ApiPropertyOptional({
    description: 'Notification channels (comma separated)',
    default: 'system,email',
    example: 'system,email',
  })
  @IsString()
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional({ description: 'Whether rule is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
