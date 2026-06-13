import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export enum TriggerType {
  VARIANCE_PCT = 'variance_pct',
  VARIANCE_AMOUNT = 'variance_amount',
  KPI_BREACH = 'kpi_breach',
  BUDGET_APPROVAL = 'budget_approval',
  IMPORT_FAILED = 'import_failed',
}

export class CreateNotificationRuleDto {
  @IsString()
  ruleName!: string;

  @IsEnum(TriggerType)
  triggerType!: TriggerType;

  @IsOptional()
  @IsNumber()
  thresholdValue?: number;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsArray()
  notifyRoles?: string[];

  @IsOptional()
  @IsArray()
  notifyUsers?: string[];

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
