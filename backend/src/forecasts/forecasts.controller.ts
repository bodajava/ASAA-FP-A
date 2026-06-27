import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import {
  ForecastsService,
  ForecastCycleResponseDto,
} from './forecasts.service';
import { CreateForecastCycleDto } from './dto/create-forecast-cycle.dto';
import { UpdateForecastCycleDto } from './dto/update-forecast-cycle.dto';
import { UpdateForecastStatusDto } from './dto/update-forecast-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Forecasts')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('forecasts')
export class ForecastsController {
  constructor(private readonly forecastsService: ForecastsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new forecast cycle with lines' })
  @ApiResponse({
    status: 201,
    description: 'Forecast cycle created successfully.',
  })
  create(
    @Body() createDto: CreateForecastCycleDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ForecastCycleResponseDto> {
    return this.forecastsService.create(
      createDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all forecast cycles under the company' })
  @ApiResponse({ status: 200, description: 'List of forecast cycles.' })
  findAll(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.forecastsService.findAll(
      companyId,
      req.user.tenantId,
      paginationDto,
      req.user.id,
      req.user.role?.name,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a forecast cycle by ID' })
  @ApiResponse({ status: 200, description: 'Forecast cycle details.' })
  @ApiResponse({ status: 404, description: 'Forecast cycle not found.' })
  findOne(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ForecastCycleResponseDto> {
    return this.forecastsService.findOne(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
      req.user.role?.name,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update forecast cycle metadata and lines' })
  @ApiResponse({
    status: 200,
    description: 'Forecast cycle updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot edit approved or locked forecast cycles.',
  })
  @ApiResponse({ status: 404, description: 'Forecast cycle not found.' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateForecastCycleDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ForecastCycleResponseDto> {
    return this.forecastsService.update(
      BigInt(id),
      updateDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a forecast cycle' })
  @ApiResponse({
    status: 200,
    description: 'Forecast cycle deleted successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete approved or locked forecast cycles.',
  })
  @ApiResponse({ status: 404, description: 'Forecast cycle not found.' })
  remove(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ForecastCycleResponseDto> {
    return this.forecastsService.remove(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Patch(':id/status')
  @Roles('CFO', 'FP&A Manager')
  @ApiOperation({ summary: 'Transition status of a forecast cycle' })
  @ApiResponse({
    status: 200,
    description: 'Status transitioned successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition or locked cycle modification.',
  })
  @ApiResponse({ status: 404, description: 'Forecast cycle not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateForecastStatusDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ForecastCycleResponseDto> {
    return this.forecastsService.updateStatus(
      BigInt(id),
      statusDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(':id/generate')
  @ApiOperation({
    summary: 'Automatically generate forecast lines based on the cycle method',
  })
  @ApiResponse({
    status: 200,
    description: 'Forecast lines generated successfully.',
  })
  @ApiResponse({ status: 404, description: 'Forecast cycle not found.' })
  generateLines(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ForecastCycleResponseDto> {
    return this.forecastsService.generateForecastLines(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Get('costing-summary/:id')
  @ApiOperation({ summary: 'Get costing summary for a forecast cycle' })
  async getForecastCostingSummary(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('Forecast ID must be a numeric string');
    }
    return this.forecastsService.getForecastCostingSummary(BigInt(id), companyId, req.user.tenantId);
  }

  @Get('accuracy')
  @ApiOperation({ summary: 'Get forecast accuracy metrics for company' })
  @ApiResponse({ status: 200 })
  getAccuracy(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('cycleId') cycleId?: string,
    @Query('fiscalYear') fiscalYear?: string,
  ): Promise<{
    overallMape: number;
    overallMae: number;
    overallRmse: number;
    byMethod: Record<string, { count: number; mape: number }>;
    recentLogs: Array<{
      id: string;
      periodMonth: number;
      forecastAmount: number;
      actualAmount: number;
      variancePct: number;
      methodUsed: string;
      confidenceScore: number | null;
      accountName?: string;
    }>;
  }> {
    return this.forecastsService.getAccuracyMetrics(
      companyId,
      req.user.tenantId,
      cycleId ? BigInt(cycleId) : undefined,
      fiscalYear ? Number(fiscalYear) : undefined,
    );
  }

  @Get('accuracy/logs')
  @ApiOperation({ summary: 'Get detailed forecast accuracy logs' })
  @ApiResponse({ status: 200 })
  getAccuracyLogs(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('cycleId') cycleId?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    total: number;
    data: Array<{
      id: string;
      periodMonth: number;
      forecastAmount: number;
      actualAmount: number;
      variancePct: number;
      methodUsed: string;
      confidenceScore: number | null;
      accountName?: string;
      cycleName?: string;
    }>;
  }> {
    return this.forecastsService.getAccuracyLogs(
      companyId,
      req.user.tenantId,
      cycleId ? BigInt(cycleId) : undefined,
      limit ? Number(limit) : 20,
    );
  }
}
