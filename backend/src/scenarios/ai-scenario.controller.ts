import {
  Controller,
  Post,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';
import { AiScenarioService } from './ai-scenario.service';
import {
  AiScenarioResponseDto,
  AiUnavailableDto,
  AiSuggestionsRequestDto,
} from './dto/ai-scenario.dto';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Scenario Planning')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scenarios')
export class AiScenarioController {
  constructor(private readonly aiScenarioService: AiScenarioService) {}

  /**
   * POST /api/scenarios/ai-suggestions
   * Returns AI-generated scenario suggestions based on aggregated company data.
   * SECURITY: No raw records, PII, or credentials are sent to the AI provider.
   */
  @Post('ai-suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate AI-powered scenario suggestions',
    description:
      'Uses Gemini AI to analyze aggregated financial data and suggest planning scenarios. Requires GEMINI_API_KEY.',
  })
  @ApiBody({
    type: AiSuggestionsRequestDto,
    description: 'Optional request body with language preference',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'AI-generated scenario suggestions.',
    type: AiScenarioResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'AI unavailable message if GEMINI_API_KEY is not set.',
    type: AiUnavailableDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires Business plan.' })
  async generateSuggestions(
    @CompanyId() companyId: bigint,
    @Request() _req: RequestWithUser,
    @Body() body?: AiSuggestionsRequestDto,
  ): Promise<AiScenarioResponseDto | AiUnavailableDto> {
    // Graceful degradation: if GEMINI_API_KEY is missing, return informative message
    if (!this.aiScenarioService.isAiAvailable()) {
      return this.aiScenarioService.getUnavailableResponse();
    }

    const language = body?.language === 'ar' ? 'ar' : 'en';
    return this.aiScenarioService.generateSuggestions(companyId, language);
  }

  /**
   * GET /api/scenarios/ai-suggestions/status
   * Check if AI is available.
   */
  @Get('ai-suggestions/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check AI scenario planner availability',
    description: 'Returns whether the AI scenario planner is configured and available.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI availability status.',
  })
  checkAvailability(): AiUnavailableDto {
    if (!this.aiScenarioService.isAiAvailable()) {
      return this.aiScenarioService.getUnavailableResponse();
    }
    return {
      message: 'AI scenario planner is available.',
      available: true,
      code: '',
    };
  }
}
