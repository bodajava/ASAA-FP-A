import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class BulkAlertsDto {
  @ApiProperty({ description: 'Array of alert IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
