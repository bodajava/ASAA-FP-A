import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
} from 'class-validator';

export class ScenarioAssumptionsDto {
  [key: string]: any;

  @ApiProperty({
    description: 'The subtype of the scenario simulation',
    enum: [
      'increase_material_prices',
      'currency_rate_change',
      'demand_decrease',
      'branch_expansion',
    ],
    example: 'increase_material_prices',
  })
  @IsString({ message: 'subtype must be a string' })
  @IsNotEmpty({ message: 'subtype is required' })
  subtype!:
    | 'increase_material_prices'
    | 'currency_rate_change'
    | 'demand_decrease'
    | 'branch_expansion';

  @ApiPropertyOptional({
    description:
      'Percentage value for cost increase or demand decrease (e.g. 10.0 for 10%)',
    example: 10.0,
  })
  @IsNumber({}, { message: 'percentage must be a number' })
  @Min(0, { message: 'percentage cannot be negative' })
  @IsOptional()
  percentage?: number;

  @ApiPropertyOptional({
    description: 'List of specific material IDs affected by raw price increase',
    example: ['1', '2'],
  })
  @IsArray({ message: 'materialIds must be an array' })
  @IsString({ each: true, message: 'materialIds must contain strings' })
  @IsOptional()
  materialIds?: string[];

  @ApiPropertyOptional({
    description: 'The source currency code (from)',
    example: 'USD',
  })
  @IsString({ message: 'fromCurrency must be a string' })
  @IsOptional()
  fromCurrency?: string;

  @ApiPropertyOptional({
    description: 'The target currency code (to)',
    example: 'EGP',
  })
  @IsString({ message: 'toCurrency must be a string' })
  @IsOptional()
  toCurrency?: string;

  @ApiPropertyOptional({
    description: 'The new exchange rate value',
    example: 50.0,
  })
  @IsNumber({}, { message: 'newRate must be a number' })
  @Min(0, { message: 'newRate cannot be negative' })
  @IsOptional()
  newRate?: number;

  @ApiPropertyOptional({
    description:
      'List of specific supplier IDs affected by currency rate change',
    example: ['1'],
  })
  @IsArray({ message: 'targetSupplierIds must be an array' })
  @IsString({ each: true, message: 'targetSupplierIds must contain strings' })
  @IsOptional()
  targetSupplierIds?: string[];

  @ApiPropertyOptional({
    description:
      'List of specific customer IDs affected by currency rate change',
    example: ['1'],
  })
  @IsArray({ message: 'targetCustomerIds must be an array' })
  @IsString({ each: true, message: 'targetCustomerIds must contain strings' })
  @IsOptional()
  targetCustomerIds?: string[];

  @ApiPropertyOptional({
    description:
      'List of specific account IDs affected by currency rate change',
    example: ['1'],
  })
  @IsArray({ message: 'targetAccountIds must be an array' })
  @IsString({ each: true, message: 'targetAccountIds must contain strings' })
  @IsOptional()
  targetAccountIds?: string[];

  @ApiPropertyOptional({
    description: 'List of specific product IDs affected by demand decrease',
    example: ['1'],
  })
  @IsArray({ message: 'productIds must be an array' })
  @IsString({ each: true, message: 'productIds must contain strings' })
  @IsOptional()
  productIds?: string[];

  @ApiPropertyOptional({
    description: 'The name of the new branch (site) to simulate',
    example: 'Alexandria Branch',
  })
  @IsString({ message: 'siteName must be a string' })
  @IsOptional()
  siteName?: string;

  @ApiPropertyOptional({
    description: 'Simulated revenue amount for the branch expansion',
    example: 100000.0,
  })
  @IsNumber({}, { message: 'revenueAmount must be a number' })
  @Min(0, { message: 'revenueAmount cannot be negative' })
  @IsOptional()
  revenueAmount?: number;

  @ApiPropertyOptional({
    description: 'Simulated expense amount for the branch expansion',
    example: 45000.0,
  })
  @IsNumber({}, { message: 'expenseAmount must be a number' })
  @Min(0, { message: 'expenseAmount cannot be negative' })
  @IsOptional()
  expenseAmount?: number;

  @ApiPropertyOptional({
    description: 'Account ID to assign simulated revenue to',
    example: '1',
  })
  @IsString({
    message: 'revenueAccountId must be a string representation of ID',
  })
  @IsOptional()
  revenueAccountId?: string;

  @ApiPropertyOptional({
    description: 'Account ID to assign simulated expense to',
    example: '2',
  })
  @IsString({
    message: 'expenseAccountId must be a string representation of ID',
  })
  @IsOptional()
  expenseAccountId?: string;
}
