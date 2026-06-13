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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { BomRecipesService, BomRecipeResponseDto } from './bom-recipes.service';
import { CreateBomRecipeDto } from './dto/create-bom-recipe.dto';
import { UpdateBomRecipeDto } from './dto/update-bom-recipe.dto';
import { ExplodeSalesPlanDto } from './dto/explode-sales-plan.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RequiredPlan } from '../common/decorators/required-plan.decorator';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('BOM Recipes')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@RequiredPlan('Enterprise')
@Controller('bom-recipes')
export class BomRecipesController {
  constructor(private readonly bomRecipesService: BomRecipesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new BOM recipe with lines' })
  @ApiResponse({ status: 201, description: 'BOM recipe created successfully.' })
  create(
    @Body() createBomRecipeDto: CreateBomRecipeDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<BomRecipeResponseDto> {
    return this.bomRecipesService.create(
      createBomRecipeDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all BOM recipes under the company' })
  @ApiResponse({ status: 200, description: 'List of BOM recipes.' })
  findAll(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.bomRecipesService.findAll(
      companyId,
      req.user.tenantId,
      paginationDto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a BOM recipe by ID' })
  @ApiResponse({ status: 200, description: 'BOM recipe details.' })
  @ApiResponse({ status: 404, description: 'BOM recipe not found.' })
  findOne(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<BomRecipeResponseDto> {
    return this.bomRecipesService.findOne(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a BOM recipe and its lines' })
  @ApiResponse({ status: 200, description: 'BOM recipe updated successfully.' })
  @ApiResponse({ status: 404, description: 'BOM recipe not found.' })
  update(
    @Param('id') id: string,
    @Body() updateBomRecipeDto: UpdateBomRecipeDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<BomRecipeResponseDto> {
    return this.bomRecipesService.update(
      BigInt(id),
      updateBomRecipeDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a BOM recipe' })
  @ApiResponse({ status: 200, description: 'BOM recipe deleted successfully.' })
  @ApiResponse({ status: 404, description: 'BOM recipe not found.' })
  remove(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<BomRecipeResponseDto> {
    return this.bomRecipesService.remove(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post('explode')
  @ApiOperation({
    summary: 'Explode a sales plan into raw material requirements',
    description:
      'Given a list of product + quantity sales plan lines, computes material requirements, wastage, labor, overhead, and total production cost using active BOM recipes.',
  })
  @ApiResponse({
    status: 200,
    description:
      'BOM explosion result with per-product breakdown and consolidated material requirements.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or missing BOM recipes.',
  })
  explodeSalesPlan(
    @Body() dto: ExplodeSalesPlanDto,
    @CompanyId() companyId: bigint,
  ): Promise<any> {
    return this.bomRecipesService.explodeSalesPlan(
      companyId,
      dto.salesPlanLines,
    );
  }
}
