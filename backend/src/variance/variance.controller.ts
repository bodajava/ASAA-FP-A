import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { VarianceService } from './variance.service';
import { VarianceQueryDto } from './dto/variance-query.dto';
import { PaginatedVarianceResponseDto } from './dto/variance-response.dto';
import { YoYComparisonQueryDto, YoYComparisonResponseDto } from './dto/yoy-comparison.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Variance Analysis')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Active Company ID is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('variance')
export class VarianceController {
  constructor(private readonly varianceService: VarianceService) {}

  @Get('budget-vs-actual')
  @ApiOperation({
    summary: 'Compare Budget vs Actual amounts',
    description:
      'Queries aggregated budgets and actual imports from vw_budget_vs_actual and calculates variance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated comparison results returned successfully.',
    type: PaginatedVarianceResponseDto,
  })
  getBudgetVsActual(
    @CompanyId() companyId: bigint,
    @Query() queryDto: VarianceQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedVarianceResponseDto> {
    return this.varianceService.compareBudgetVsActual(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('budget-vs-forecast')
  @ApiOperation({
    summary: 'Compare Budget vs Forecast amounts',
    description:
      'Queries aggregated budgets and forecasts from vw_budget_actual_forecast and calculates variance (Forecast - Budget).',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated comparison results returned successfully.',
    type: PaginatedVarianceResponseDto,
  })
  getBudgetVsForecast(
    @CompanyId() companyId: bigint,
    @Query() queryDto: VarianceQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedVarianceResponseDto> {
    return this.varianceService.compareBudgetVsForecast(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('actual-vs-forecast')
  @ApiOperation({
    summary: 'Compare Actual vs Forecast amounts',
    description:
      'Queries aggregated actuals and forecasts from vw_budget_actual_forecast and calculates variance (Forecast - Actual).',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated comparison results returned successfully.',
    type: PaginatedVarianceResponseDto,
  })
  getActualVsForecast(
    @CompanyId() companyId: bigint,
    @Query() queryDto: VarianceQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedVarianceResponseDto> {
    return this.varianceService.compareActualVsForecast(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('budget-actual-forecast')
  @ApiOperation({
    summary: 'Three-way comparison (Budget vs Actual vs Forecast)',
    description:
      'Queries all three metrics from vw_budget_actual_forecast, returning detailed variances.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated 3-way comparison results returned successfully.',
    type: PaginatedVarianceResponseDto,
  })
  getBudgetVsActualVsForecast(
    @CompanyId() companyId: bigint,
    @Query() queryDto: VarianceQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedVarianceResponseDto> {
    return this.varianceService.compareBudgetVsActualVsForecast(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('yoy')
  @ApiOperation({
    summary: 'Year-over-Year (YoY) comparison analysis',
    description: 'Compares previous year vs current year vs current year plan for major metrics.',
  })
  @ApiResponse({
    status: 200,
    type: YoYComparisonResponseDto,
  })
  getYoYComparison(
    @CompanyId() companyId: bigint,
    @Query() queryDto: YoYComparisonQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<YoYComparisonResponseDto> {
    return this.varianceService.getYoYComparison(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }
}
