import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import {
  DashboardKpisDto,
  MonthlyTrendItemDto,
  UtilizationDto,
  AccuracyDto,
  RankedItemDto,
} from './dto/dashboard-response.dto';
import { ExecutiveSummaryDto } from './dto/executive-summary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Active Company ID is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'KPI summary card metrics' })
  @ApiResponse({ status: 200, type: DashboardKpisDto })
  getSummary(
    @CompanyId() companyId: bigint,
    @Query() queryDto: DashboardQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<DashboardKpisDto> {
    return this.dashboardService.getSummary(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('executive-summary')
  @ApiOperation({ summary: 'Enterprise executive KPIs with MoM, YoY, growth %, and trend' })
  @ApiResponse({ status: 200, type: ExecutiveSummaryDto })
  getExecutiveSummary(
    @CompanyId() companyId: bigint,
    @Query() queryDto: DashboardQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<ExecutiveSummaryDto> {
    return this.dashboardService.getExecutiveSummary(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('revenue-trend')
  @ApiOperation({ summary: 'Monthly revenue trend breakdown' })
  @ApiResponse({ status: 200, type: [MonthlyTrendItemDto] })
  getRevenueTrend(
    @CompanyId() companyId: bigint,
    @Query() queryDto: DashboardQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<MonthlyTrendItemDto[]> {
    return this.dashboardService.getRevenueTrend(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('expenses-trend')
  @ApiOperation({ summary: 'Monthly expenses trend breakdown' })
  @ApiResponse({ status: 200, type: [MonthlyTrendItemDto] })
  getExpensesTrend(
    @CompanyId() companyId: bigint,
    @Query() queryDto: DashboardQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<MonthlyTrendItemDto[]> {
    return this.dashboardService.getExpensesTrend(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('gross-profit-trend')
  @ApiOperation({ summary: 'Monthly gross profit trend breakdown' })
  @ApiResponse({ status: 200, type: [MonthlyTrendItemDto] })
  getGrossProfitTrend(
    @CompanyId() companyId: bigint,
    @Query() queryDto: DashboardQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<MonthlyTrendItemDto[]> {
    return this.dashboardService.getGrossProfitTrend(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('net-profit-trend')
  @ApiOperation({ summary: 'Monthly net profit trend breakdown' })
  @ApiResponse({ status: 200, type: [MonthlyTrendItemDto] })
  getNetProfitTrend(
    @CompanyId() companyId: bigint,
    @Query() queryDto: DashboardQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<MonthlyTrendItemDto[]> {
    return this.dashboardService.getNetProfitTrend(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('cash-balance-trend')
  @ApiOperation({ summary: 'Monthly cash balance trend breakdown' })
  @ApiResponse({ status: 200, type: [MonthlyTrendItemDto] })
  getCashBalanceTrend(
    @CompanyId() companyId: bigint,
    @Query() queryDto: DashboardQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<MonthlyTrendItemDto[]> {
    return this.dashboardService.getCashBalanceTrend(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('budget-utilization')
  @ApiOperation({ summary: 'Budget utilization ratio comparison' })
  @ApiResponse({ status: 200, type: UtilizationDto })
  getBudgetUtilization(
    @CompanyId() companyId: bigint,
    @Query() queryDto: DashboardQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<UtilizationDto> {
    return this.dashboardService.getBudgetUtilization(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('forecast-accuracy')
  @ApiOperation({ summary: 'Actual vs forecast accuracy metrics' })
  @ApiResponse({ status: 200, type: AccuracyDto })
  getForecastAccuracy(
    @CompanyId() companyId: bigint,
    @Query() queryDto: DashboardQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<AccuracyDto> {
    return this.dashboardService.getForecastAccuracy(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top products by sales value' })
  @ApiResponse({ status: 200, type: [RankedItemDto] })
  getTopProducts(
    @CompanyId() companyId: bigint,
    @Query() queryDto: DashboardQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<RankedItemDto[]> {
    return this.dashboardService.getTopProducts(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('top-customers')
  @ApiOperation({ summary: 'Top customers by revenue contribution' })
  @ApiResponse({ status: 200, type: [RankedItemDto] })
  getTopCustomers(
    @CompanyId() companyId: bigint,
    @Query() queryDto: DashboardQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<RankedItemDto[]> {
    return this.dashboardService.getTopCustomers(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('top-branches')
  @ApiOperation({ summary: 'Top branches (sites) by net profit' })
  @ApiResponse({ status: 200, type: [RankedItemDto] })
  getTopBranches(
    @CompanyId() companyId: bigint,
    @Query() queryDto: DashboardQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<RankedItemDto[]> {
    return this.dashboardService.getTopBranches(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('costing')
  @ApiOperation({ summary: 'Get costing and profitability summary for dashboard' })
  async getCostingSummary(
    @CompanyId() companyId: bigint,
    @Query() queryDto: DashboardQueryDto,
    @Request() req: RequestWithUser,
  ) {
    return this.dashboardService.getCostingSummary(companyId, req.user.tenantId, queryDto);
  }

  @Get('module-summary')
  @ApiOperation({ summary: 'Counts from every module in the ERP system' })
  @ApiResponse({ status: 200, description: 'Module entity counts' })
  getModuleSummary(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<Record<string, number>> {
    return this.dashboardService.getModuleSummary(companyId, req.user.tenantId);
  }
}
