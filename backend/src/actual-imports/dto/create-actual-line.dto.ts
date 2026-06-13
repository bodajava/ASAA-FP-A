import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateActualLineDto {
  @ApiProperty({
    description: 'The Account ID this transaction belongs to',
    example: '1',
  })
  @IsString({ message: 'accountId must be a string representation of ID' })
  @IsNotEmpty({ message: 'accountId is required' })
  accountId!: string;

  @ApiPropertyOptional({
    description: 'Optional Site ID',
    example: '2',
  })
  @IsString({ message: 'siteId must be a string representation of ID' })
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional({
    description: 'Optional Cost Center ID',
    example: '3',
  })
  @IsString({ message: 'costCenterId must be a string representation of ID' })
  @IsOptional()
  costCenterId?: string;

  @ApiPropertyOptional({
    description: 'Optional Product ID',
    example: '4',
  })
  @IsString({ message: 'productId must be a string representation of ID' })
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Optional Material ID',
    example: '5',
  })
  @IsString({ message: 'materialId must be a string representation of ID' })
  @IsOptional()
  materialId?: string;

  @ApiPropertyOptional({
    description: 'Optional Customer ID',
    example: '6',
  })
  @IsString({ message: 'customerId must be a string representation of ID' })
  @IsOptional()
  customerId?: string;

  @ApiProperty({
    description: 'The transaction date (ISO 8601 date string)',
    example: '2026-06-01',
  })
  @IsDateString({}, { message: 'transactionDate must be a valid date string' })
  @IsNotEmpty({ message: 'transactionDate is required' })
  transactionDate!: string;

  @ApiPropertyOptional({
    description: 'Quantity of items in transaction',
    example: 50,
  })
  @IsNumber({}, { message: 'quantity must be a number' })
  @Min(0, { message: 'quantity cannot be negative' })
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Unit price of item',
    example: 10.5,
  })
  @IsNumber({}, { message: 'unitPrice must be a number' })
  @Min(0, { message: 'unitPrice cannot be negative' })
  @IsOptional()
  unitPrice?: number;

  @ApiProperty({
    description: 'Total transaction amount',
    example: 525.0,
  })
  @IsNumber({}, { message: 'amount must be a number' })
  @Min(0, { message: 'amount cannot be negative' })
  @IsNotEmpty({ message: 'amount is required' })
  amount!: number;

  @ApiPropertyOptional({
    description: 'Reference transaction number',
    example: 'TX-998822',
  })
  @IsString({ message: 'referenceNo must be a string' })
  @IsOptional()
  referenceNo?: string;
}
