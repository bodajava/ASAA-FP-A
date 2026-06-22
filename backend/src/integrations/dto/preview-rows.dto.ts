import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsObject, IsOptional, IsNumber } from 'class-validator';

export class PreviewRowsDto {
  @ApiProperty({
    description: 'Name of the source Oracle table or view to preview',
    example: 'FP_GL_ACTUALS',
  })
  @IsString()
  @IsNotEmpty()
  sourceTable!: string;

  @ApiProperty({
    description: 'Mapping configuration representing the columns to select',
    example: {
      accountCode: 'ACCOUNT_CODE',
      amount: 'AMOUNT',
      transactionDate: 'TRANSACTION_DATE',
    },
  })
  @IsObject()
  @IsNotEmpty()
  mappingConfig!: Record<string, string | null>;

  @ApiPropertyOptional({
    description: 'Max number of rows to retrieve',
    default: 10,
    example: 10,
  })
  @IsNumber()
  @IsOptional()
  limit?: number;
}
