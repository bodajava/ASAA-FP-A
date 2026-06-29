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
import { BudgetsService, BudgetCycleResponseDto } from './budgets.service';
import { CreateBudgetCycleDto } from './dto/create-budget-cycle.dto';
import { UpdateBudgetCycleDto } from './dto/update-budget-cycle.dto';
import { UpdateBudgetStatusDto } from './dto/update-budget-status.dto';
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

@ApiTags('Budgets')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new budget cycle with lines' })
  @ApiResponse({
    status: 201,
    description: 'Budget cycle created successfully.',
  })
  create(
    @Body() createBudgetCycleDto: CreateBudgetCycleDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<BudgetCycleResponseDto> {
    return this.budgetsService.create(
      createBudgetCycleDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all budget cycles under the company' })
  @ApiResponse({ status: 200, description: 'List of budget cycles.' })
  findAll(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.budgetsService.findAll(
      companyId,
      req.user.tenantId,
      paginationDto,
      req.user.id,
      req.user.role?.name,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget cycle by ID' })
  @ApiResponse({ status: 200, description: 'Budget cycle details.' })
  @ApiResponse({ status: 404, description: 'Budget cycle not found.' })
  findOne(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<BudgetCycleResponseDto> {
    return this.budgetsService.findOne(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget cycle and replace its lines' })
  @ApiResponse({
    status: 200,
    description: 'Budget cycle updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot edit approved or locked budget cycles.',
  })
  @ApiResponse({ status: 404, description: 'Budget cycle not found.' })
  update(
    @Param('id') id: string,
    @Body() updateBudgetCycleDto: UpdateBudgetCycleDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<BudgetCycleResponseDto> {
    return this.budgetsService.update(
      BigInt(id),
      updateBudgetCycleDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget cycle' })
  @ApiResponse({
    status: 200,
    description: 'Budget cycle deleted successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete approved or locked budget cycles.',
  })
  @ApiResponse({ status: 404, description: 'Budget cycle not found.' })
  remove(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<BudgetCycleResponseDto> {
    return this.budgetsService.remove(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get('by-cost-category/:id')
  @ApiOperation({ summary: 'Get budget lines grouped by cost category' })
  async getBudgetByCostCategory(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('Budget ID must be a numeric string');
    }
    return this.budgetsService.getBudgetByCostCategory(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch(':id/status')
  @Roles('CFO', 'FP&A Manager')
  @ApiOperation({ summary: 'Transition budget cycle status' })
  @ApiResponse({
    status: 200,
    description: 'Budget status updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition.' })
  @ApiResponse({ status: 404, description: 'Budget cycle not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateBudgetStatusDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<BudgetCycleResponseDto> {
    return this.budgetsService.updateStatus(
      BigInt(id),
      statusDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }
}
