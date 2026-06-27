import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class MarketRateDto {
  @IsString()
  currency!: string;

  @IsNumber()
  rate!: number;

  @IsNumber()
  previousRate!: number;

  @IsNumber()
  change!: number;

  @IsNumber()
  changePct!: number;

  @IsString()
  trend!: 'up' | 'down' | 'neutral';

  @IsString()
  lastUpdate!: string;

  @IsString()
  source!: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsBoolean()
  stale?: boolean;

  @IsOptional()
  @IsString()
  staleReason?: string;
}

export class MarketWidgetDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarketRateDto)
  rates!: MarketRateDto[];

  @IsOptional()
  @IsString()
  lastSyncAt!: string | null;

  @IsString()
  baseCurrency!: string;

  @IsOptional()
  @IsString()
  provider?: string;
}
