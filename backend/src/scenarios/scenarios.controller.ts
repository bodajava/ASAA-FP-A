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
  HttpCode,
  HttpStatus,
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
  ScenariosService,
  ScenarioResponseDto,
  SimulationResultDto,
} from './scenarios.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { PreviewSimulationDto } from './dto/preview-simulation.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

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
export class ScenariosController {
  constructor(private readonly scenariosService: ScenariosService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new scenario planning model with assumptions',
  })
  @ApiResponse({ status: 201, description: 'Scenario created successfully.' })
  create(
    @Body() createDto: CreateScenarioDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ScenarioResponseDto> {
    return this.scenariosService.create(
      createDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all scenarios under the company' })
  @ApiResponse({ status: 200, description: 'List of scenarios.' })
  findAll(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.scenariosService.findAll(
      companyId,
      req.user.tenantId,
      paginationDto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific scenario' })
  @ApiResponse({ status: 200, description: 'Scenario details.' })
  @ApiResponse({ status: 404, description: 'Scenario not found.' })
  findOne(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ScenarioResponseDto> {
    return this.scenariosService.findOne(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update scenario metadata or assumptions' })
  @ApiResponse({ status: 200, description: 'Scenario updated successfully.' })
  @ApiResponse({ status: 404, description: 'Scenario not found.' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateScenarioDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ScenarioResponseDto> {
    return this.scenariosService.update(
      BigInt(id),
      updateDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a scenario' })
  @ApiResponse({ status: 200, description: 'Scenario deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Scenario not found.' })
  remove(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ScenarioResponseDto> {
    return this.scenariosService.remove(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post('simulate-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Run impact simulation and preview results without saving permanently',
  })
  @ApiResponse({
    status: 200,
    description:
      'Simulation completed. Returns original totals, simulated totals, and line comparisons.',
  })
  simulateImpact(
    @Body() previewDto: PreviewSimulationDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<SimulationResultDto> {
    return this.scenariosService.simulateImpact(
      previewDto,
      companyId,
      req.user.tenantId,
    );
  }

  @Get('costing-impact/:id')
  @ApiOperation({ summary: 'Get costing impact analysis for a scenario' })
  async getCostingImpact(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('Scenario ID must be a numeric string');
    }
    return this.scenariosService.getCostingImpact(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Get('comparison')
  @ApiOperation({
    summary: 'Scenario comparison data',
    description:
      'Returns Previous Year, Current Year, and Scenario data side-by-side for comparison.',
  })
  async getComparison(
    @CompanyId() companyId: bigint,
    @Query('previousYear') previousYear: string,
    @Query('currentYear') currentYear: string,
    @Query('scenarioId') scenarioId: string,
    @Query('productId') productId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.scenariosService.getComparison(
      companyId,
      req.user.tenantId,
      Number(previousYear) || new Date().getFullYear() - 1,
      Number(currentYear) || new Date().getFullYear(),
      scenarioId ? BigInt(scenarioId) : undefined,
      productId ? BigInt(productId) : undefined,
    );
  }
}
