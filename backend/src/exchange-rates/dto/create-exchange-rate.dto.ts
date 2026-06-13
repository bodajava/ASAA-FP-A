import {
  IsString,
  IsNumber,
  IsDateString,
  IsEnum,
  IsOptional,
  Length,
  Min,
} from 'class-validator';

export enum RateSource {
  MANUAL = 'manual',
  API = 'api',
  IMPORT = 'import',
}

export class CreateExchangeRateDto {
  @IsString()
  @Length(3, 3)
  fromCurrency!: string;

  @IsString()
  @Length(3, 3)
  toCurrency!: string;

  @IsNumber()
  @Min(0.000001)
  rate!: number;

  @IsDateString()
  rateDate!: string;

  @IsEnum(RateSource)
  @IsOptional()
  source?: RateSource;
}
