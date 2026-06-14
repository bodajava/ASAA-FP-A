import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Res,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';
import {
  PlReportDto,
  CashFlowReportDto,
  GrossMarginReportDto,
  NetProfitReportDto,
  BudgetVsActualReportDto,
  ForecastAccuracyReportDto,
  ProductProfitabilityReportDto,
  BranchProfitabilityReportDto,
  FactoryCostingReportDto,
  InventoryCoverageReportDto,
  SlowMovingItemsReportDto,
  WastageAnalysisReportDto,
  CustomerProfitabilityReportDto,
  ProductCostVarianceReportDto,
  ProductionCapacityReportDto,
  CashFlowForecastReportDto,
  ExportResultDto,
  PaginatedReportResponseDto,
} from './dto/report-response.dto';
import { ReportMetaResponseDto } from './dto/report-meta-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Reports')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Active Company ID is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('meta')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get report type definitions/metadata' })
  @ApiResponse({ status: 200, type: [ReportMetaResponseDto] })
  getReportMetas(): ReportMetaResponseDto[] {
    return this.reportsService.getReportMetas();
  }

  @Get('pl')
  @ApiOperation({ summary: 'Profit & Loss (P&L) Report' })
  @ApiResponse({ status: 200, type: [PlReportDto] })
  getPl(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<PlReportDto[]> {
    return this.reportsService.getPl(companyId, req.user.tenantId, queryDto);
  }

  @Get('cashflow')
  @ApiOperation({ summary: 'Cash Flow Report' })
  @ApiResponse({ status: 200, type: [CashFlowReportDto] })
  getCashFlow(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<CashFlowReportDto[]> {
    return this.reportsService.getCashFlow(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('gross-margin')
  @ApiOperation({ summary: 'Gross Margin Report' })
  @ApiResponse({ status: 200, type: [GrossMarginReportDto] })
  getGrossMargin(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<GrossMarginReportDto[]> {
    return this.reportsService.getGrossMargin(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('net-profit')
  @ApiOperation({ summary: 'Net Profit Report' })
  @ApiResponse({ status: 200, type: [NetProfitReportDto] })
  getNetProfit(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<NetProfitReportDto[]> {
    return this.reportsService.getNetProfit(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('budget-vs-actual')
  @ApiOperation({ summary: 'Budget vs Actual Report' })
  @ApiResponse({ status: 200, type: PaginatedReportResponseDto })
  getBudgetVsActual(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedReportResponseDto<BudgetVsActualReportDto>> {
    return this.reportsService.getBudgetVsActual(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('forecast-accuracy')
  @ApiOperation({ summary: 'Forecast Accuracy Report' })
  @ApiResponse({ status: 200, type: [ForecastAccuracyReportDto] })
  getForecastAccuracy(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<ForecastAccuracyReportDto[]> {
    return this.reportsService.getForecastAccuracy(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('product-profitability')
  @ApiOperation({ summary: 'Product Profitability Report' })
  @ApiResponse({ status: 200, type: PaginatedReportResponseDto })
  getProductProfitability(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedReportResponseDto<ProductProfitabilityReportDto>> {
    return this.reportsService.getProductProfitability(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('branch-profitability')
  @ApiOperation({ summary: 'Branch Profitability Report' })
  @ApiResponse({ status: 200, type: PaginatedReportResponseDto })
  getBranchProfitability(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedReportResponseDto<BranchProfitabilityReportDto>> {
    return this.reportsService.getBranchProfitability(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('factory-costing')
  @ApiOperation({ summary: 'Factory Costing Report' })
  @ApiResponse({ status: 200, type: [FactoryCostingReportDto] })
  getFactoryCosting(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<FactoryCostingReportDto[]> {
    return this.reportsService.getFactoryCosting(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('inventory-coverage')
  @ApiOperation({ summary: 'Inventory Coverage Report' })
  @ApiResponse({ status: 200, type: PaginatedReportResponseDto })
  getInventoryCoverage(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedReportResponseDto<InventoryCoverageReportDto>> {
    return this.reportsService.getInventoryCoverage(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('slow-moving-items')
  @ApiOperation({ summary: 'Slow Moving Items Report' })
  @ApiResponse({ status: 200, type: PaginatedReportResponseDto })
  getSlowMovingItems(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedReportResponseDto<SlowMovingItemsReportDto>> {
    return this.reportsService.getSlowMovingItems(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('wastage-analysis')
  @ApiOperation({ summary: 'Wastage Analysis Report' })
  @ApiResponse({ status: 200, type: [WastageAnalysisReportDto] })
  getWastageAnalysis(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<WastageAnalysisReportDto[]> {
    return this.reportsService.getWastageAnalysis(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('customer-profitability')
  @ApiOperation({ summary: 'Customer Profitability Report' })
  @ApiResponse({ status: 200, type: PaginatedReportResponseDto })
  getCustomerProfitability(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedReportResponseDto<CustomerProfitabilityReportDto>> {
    return this.reportsService.getCustomerProfitability(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  // ============================================================
  // NEW REPORTS
  // ============================================================

  @Get('product-cost-variance')
  @ApiOperation({
    summary: 'Product Cost Variance - مقارنة تكلفة المنتج المخططة بالفعلي',
  })
  @ApiResponse({ status: 200, type: PaginatedReportResponseDto })
  getProductCostVariance(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedReportResponseDto<ProductCostVarianceReportDto>> {
    return this.reportsService.getProductCostVariance(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('production-capacity')
  @ApiOperation({
    summary: 'Production Capacity Analysis - تحليل الطاقة الإنتاجية',
  })
  @ApiResponse({ status: 200, type: PaginatedReportResponseDto })
  getProductionCapacity(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<PaginatedReportResponseDto<ProductionCapacityReportDto>> {
    return this.reportsService.getProductionCapacity(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('cash-flow-forecast')
  @ApiOperation({ summary: 'Cash Flow Forecast - توقع التدفقات النقدية' })
  @ApiResponse({ status: 200, type: [CashFlowForecastReportDto] })
  getCashFlowForecast(
    @CompanyId() companyId: bigint,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<CashFlowForecastReportDto[]> {
    return this.reportsService.getCashFlowForecast(
      companyId,
      req.user.tenantId,
      queryDto,
    );
  }

  @Get('export/:reportType')
  @ApiOperation({ summary: 'Export report as CSV' })
  @ApiResponse({ status: 200, type: ExportResultDto })
  async exportReport(
    @CompanyId() companyId: bigint,
    @Param('reportType') reportType: string,
    @Query() queryDto: ReportQueryDto,
    @Request() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.reportsService.exportReport(
      companyId,
      req.user.tenantId,
      reportType,
      queryDto,
    );

    const buffer = Buffer.from(result.content, 'base64');
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(buffer);
  }
}
