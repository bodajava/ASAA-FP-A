import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for a single assumption key-value pair returned by the AI.
 * SECURITY NOTE: Only aggregated, anonymized data is sent to Gemini.
 * No raw company records, customer PII, or credentials are included.
 */
export class AiAssumptionDto {
  @ApiProperty({
    description: 'Assumption parameter key',
    example: 'rawMaterialPriceChangePercent',
  })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ description: 'Assumption value', example: 15 })
  @IsNumber()
  value!: number;

  @ApiProperty({
    description: 'Unit of the value',
    example: 'percent',
    enum: ['percent', 'amount', 'count', 'text'],
  })
  @IsString()
  @IsNotEmpty()
  unit!: 'percent' | 'amount' | 'count' | 'text';

  @ApiProperty({
    description: 'Human-readable description',
    example: 'Expected raw material price increase',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;
}

/**
 * Expected financial impact returned by the AI.
 * SECURITY NOTE: These are AI-predicted estimates based on aggregated summaries only.
 */
export class AiExpectedImpactDto {
  @ApiProperty({ description: 'Revenue impact percentage', example: -5.2 })
  @IsNumber()
  revenueImpactPercent!: number;

  @ApiProperty({ description: 'Cost impact percentage', example: 8.5 })
  @IsNumber()
  costImpactPercent!: number;

  @ApiProperty({ description: 'Gross margin impact percentage', example: -3.1 })
  @IsNumber()
  grossMarginImpactPercent!: number;

  @ApiProperty({ description: 'Net profit impact percentage', example: -7.4 })
  @IsNumber()
  netProfitImpactPercent!: number;

  @ApiProperty({ description: 'Cash flow impact percentage', example: -4.8 })
  @IsNumber()
  cashFlowImpactPercent!: number;
}

/**
 * Simulation inputs for pre-filling the manual scenario form.
 * SECURITY NOTE: No private identifiers or credentials are included.
 */
export class AiSimulationInputsDto {
  @ApiProperty({ description: 'Raw material price change %', example: 15 })
  @IsNumber()
  rawMaterialPriceChangePercent!: number;

  @ApiProperty({ description: 'Currency change %', example: -10 })
  @IsNumber()
  currencyChangePercent!: number;

  @ApiProperty({ description: 'Demand change %', example: -20 })
  @IsNumber()
  demandChangePercent!: number;

  @ApiProperty({ description: 'Number of new branches', example: 1 })
  @IsNumber()
  branchExpansionCount!: number;
}

/**
 * A single AI-generated scenario suggestion.
 * SECURITY NOTE: Only aggregated, anonymized summaries are used.
 * No raw transaction rows, customer PII, supplier details, or credentials are sent.
 */
export class AiScenarioSuggestionDto {
  @ApiProperty({
    description: 'Scenario title',
    example: 'Raw Material Price Surge Impact',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: 'Scenario type',
    example: 'raw_material_price_increase',
    enum: [
      'raw_material_price_increase',
      'currency_change',
      'demand_decrease',
      'branch_expansion',
      'mixed',
    ],
  })
  @IsString()
  @IsNotEmpty()
  type!:
    | 'raw_material_price_increase'
    | 'currency_change'
    | 'demand_decrease'
    | 'branch_expansion'
    | 'mixed';

  @ApiProperty({ description: 'Confidence score (0-100)', example: 82 })
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence!: number;

  @ApiProperty({
    description: 'Human-readable summary',
    example: 'Based on current raw material price trends...',
  })
  @IsString()
  @IsNotEmpty()
  summary!: string;

  @ApiProperty({ description: 'Key assumptions', type: [AiAssumptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiAssumptionDto)
  assumptions!: AiAssumptionDto[];

  @ApiProperty({
    description: 'Expected financial impact',
    type: AiExpectedImpactDto,
  })
  @ValidateNested()
  @Type(() => AiExpectedImpactDto)
  expectedImpact!: AiExpectedImpactDto;

  @ApiProperty({
    description: 'Recommended actions',
    example: ['Lock supplier contracts now', 'Hedge currency exposure'],
  })
  @IsArray()
  @IsString({ each: true })
  recommendedActions!: string[];

  @ApiProperty({
    description: 'Simulation inputs for manual form prefill',
    type: AiSimulationInputsDto,
  })
  @ValidateNested()
  @Type(() => AiSimulationInputsDto)
  simulationInputs!: AiSimulationInputsDto;
}

/**
 * Full AI response containing multiple scenario suggestions.
 * SECURITY NOTE: This structure is strictly validated via class-validator.
 * Only aggregated, anonymized summaries are used to generate these suggestions.
 */
export class AiScenarioResponseDto {
  @ApiProperty({
    description: 'List of AI-generated scenario suggestions',
    type: [AiScenarioSuggestionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiScenarioSuggestionDto)
  scenarios!: AiScenarioSuggestionDto[];
}

/**
 * Response DTO for the AI suggestions endpoint when Gemini is not configured.
 */
export class AiUnavailableDto {
  @ApiProperty({
    description: 'Error message',
    example: 'AI suggestions unavailable. Please configure GEMINI_API_KEY.',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ description: 'Whether AI is available', example: false })
  available!: boolean;

  @ApiProperty({
    description: 'Error code for i18n',
    example: 'AI_UNAVAILABLE',
  })
  @IsString()
  code!: string;
}

/**
 * Request DTO for the AI suggestions endpoint.
 * Allows the client to specify the desired response language.
 */
export class AiSuggestionsRequestDto {
  @ApiProperty({
    description: 'Desired language for AI-generated content',
    example: 'en',
    enum: ['en', 'ar'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'ar'])
  language?: 'en' | 'ar';
}
