import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { CostingService } from './costing.service';
import {
  ProductCostingDetailDto,
  ProductCostSnapshotDto,
  ProductProfitabilityItemDto,
  CostDriverItemDto,
  StandardVsActualItemDto,
  RecalculateResponseDto,
  CreateAllocationDto,
  CostBreakdownReportItemDto,
  ManufacturingCostReportItemDto,
  PackagingCostReportItemDto,
  MaterialConsumptionReportItemDto,
  YieldAnalysisReportItemDto,
} from './dto/costing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { Request as ExpressRequest } from 'express';
import { AuthUser } from '../auth/auth.service';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Product Costing')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Active Company ID is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('product-costing')
export class CostingController {
  constructor(private readonly costingService: CostingService) {}

  @Get('products/:productId/breakdown')
  @ApiOperation({ summary: 'Get cost breakdown (Standard and Actual) for a product' })
  @ApiResponse({ status: 200, type: ProductCostingDetailDto })
  getProductBreakdown(
    @Param('productId') productIdStr: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('period') period?: string,
  ): Promise<ProductCostingDetailDto> {
    const periodValue = period || new Date().toISOString().substring(0, 7); // Default to current month e.g. "2026-06"
    return this.costingService.getProductCostingDetail(
      BigInt(productIdStr),
      companyId,
      req.user.tenantId,
      periodValue,
    );
  }

  @Get('products/:productId/snapshots')
  @ApiOperation({ summary: 'Get all historical snapshots for a product' })
  @ApiResponse({ status: 200, type: [ProductCostSnapshotDto] })
  getProductSnapshots(
    @Param('productId') productIdStr: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ProductCostSnapshotDto[]> {
    return this.costingService.getProductSnapshots(
      BigInt(productIdStr),
      companyId,
      req.user.tenantId,
    );
  }

  @Post('products/:productId/recalculate')
  @ApiOperation({ summary: 'Recalculate costs and store a new snapshot for a product' })
  @ApiResponse({ status: 200, type: ProductCostSnapshotDto })
  recalculate(
    @Param('productId') productIdStr: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('period') period?: string,
  ): Promise<ProductCostSnapshotDto> {
    const periodValue = period || new Date().toISOString().substring(0, 7);
    return this.costingService.recalculateAndSnapshot(
      BigInt(productIdStr),
      companyId,
      req.user.tenantId,
      periodValue,
    );
  }

  @Get('reports/product-profitability')
  @ApiOperation({ summary: 'Get product profitability report' })
  @ApiResponse({ status: 200, type: [ProductProfitabilityItemDto] })
  getProductProfitabilityReport(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('period') period?: string,
  ): Promise<ProductProfitabilityItemDto[]> {
    const periodValue = period || new Date().toISOString().substring(0, 7);
    return this.costingService.getProductProfitabilityReport(
      companyId,
      req.user.tenantId,
      periodValue,
    );
  }

  @Get('reports/cost-drivers')
  @ApiOperation({ summary: 'Get cost drivers analysis' })
  @ApiResponse({ status: 200, type: [CostDriverItemDto] })
  getCostDrivers(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<CostDriverItemDto[]> {
    return this.costingService.getCostDrivers(companyId, req.user.tenantId);
  }

  @Get('reports/standard-vs-actual')
  @ApiOperation({ summary: 'Get standard vs actual cost report' })
  @ApiResponse({ status: 200, type: [StandardVsActualItemDto] })
  getStandardVsActualReport(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('period') period?: string,
  ): Promise<StandardVsActualItemDto[]> {
    const periodValue = period || new Date().toISOString().substring(0, 7);
    return this.costingService.getStandardVsActualReport(
      companyId,
      req.user.tenantId,
      periodValue,
    );
  }

  @Post('allocations')
  @ApiOperation({ summary: 'Allocate actual production expenses' })
  @ApiResponse({ status: 201 })
  createAllocation(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Body() dto: CreateAllocationDto,
  ): Promise<unknown> {
    return this.costingService.createAllocation(companyId, req.user.tenantId, dto);
  }

  @Get('reports/product-cost-breakdown')
  @ApiOperation({ summary: 'Get product cost breakdown report' })
  @ApiResponse({ status: 200, type: [CostBreakdownReportItemDto] })
  getCostBreakdownReport(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('period') period?: string,
  ): Promise<CostBreakdownReportItemDto[]> {
    const periodValue = period || new Date().toISOString().substring(0, 7);
    return this.costingService.getCostBreakdownReport(companyId, req.user.tenantId, periodValue);
  }

  @Get('reports/manufacturing-cost')
  @ApiOperation({ summary: 'Get manufacturing cost report' })
  @ApiResponse({ status: 200, type: [ManufacturingCostReportItemDto] })
  getManufacturingCostReport(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('period') period?: string,
  ): Promise<ManufacturingCostReportItemDto[]> {
    const periodValue = period || new Date().toISOString().substring(0, 7);
    return this.costingService.getManufacturingCostReport(companyId, req.user.tenantId, periodValue);
  }

  @Get('reports/packaging-cost')
  @ApiOperation({ summary: 'Get packaging cost report' })
  @ApiResponse({ status: 200, type: [PackagingCostReportItemDto] })
  getPackagingCostReport(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('period') period?: string,
  ): Promise<PackagingCostReportItemDto[]> {
    const periodValue = period || new Date().toISOString().substring(0, 7);
    return this.costingService.getPackagingCostReport(companyId, req.user.tenantId, periodValue);
  }

  @Get('reports/material-consumption')
  @ApiOperation({ summary: 'Get material consumption report' })
  @ApiResponse({ status: 200, type: [MaterialConsumptionReportItemDto] })
  getMaterialConsumptionReport(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('period') period?: string,
  ): Promise<MaterialConsumptionReportItemDto[]> {
    const periodValue = period || new Date().toISOString().substring(0, 7);
    return this.costingService.getMaterialConsumptionReport(companyId, req.user.tenantId, periodValue);
  }

  @Get('reports/yield-analysis')
  @ApiOperation({ summary: 'Get yield analysis report' })
  @ApiResponse({ status: 200, type: [YieldAnalysisReportItemDto] })
  getYieldAnalysisReport(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('period') period?: string,
  ): Promise<YieldAnalysisReportItemDto[]> {
    const periodValue = period || new Date().toISOString().substring(0, 7);
    return this.costingService.getYieldAnalysisReport(companyId, req.user.tenantId, periodValue);
  }

  @Get('dashboard-summary')
  @ApiOperation({ summary: 'Get costing dashboard summary metrics' })
  getDashboardSummary(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('period') period?: string,
  ): Promise<any> {
    const periodValue = period || new Date().toISOString().substring(0, 7);
    return this.costingService.getCostingDashboardSummary(
      companyId,
      req.user.tenantId,
      periodValue,
    );
  }
}
