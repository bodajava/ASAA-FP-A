import { IsNumber, IsArray, IsString } from 'class-validator';

export class SyncAllRatesResultDto {
  @IsNumber()
  updatedCount!: number;

  @IsArray()
  @IsString({ each: true })
  currencies!: string[];

  @IsString()
  syncedAt!: string;
}
