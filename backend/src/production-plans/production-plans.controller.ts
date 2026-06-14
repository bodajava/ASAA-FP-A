import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
} from '@nestjs/swagger';
import { ProductionPlansService } from './production-plans.service';
import { CreateProductionPlanDto } from './dto/create-production-plan.dto';
import { SaveFromExplosionDto } from './dto/save-from-explosion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CompanyId } from '../common/decorators/company.decorator';

@ApiTags('Production Plans')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('production-plans')
export class ProductionPlansController {
  constructor(private readonly service: ProductionPlansService) {}

  @Post()
  @Roles('admin', 'fpna_manager', 'production_manager')
  @ApiOperation({ summary: 'Create a production plan' })
  create(@CompanyId() companyId: bigint, @Body() dto: CreateProductionPlanDto) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Roles(
    'admin',
    'fpna_manager',
    'production_manager',
    'financial_analyst',
    'viewer',
  )
  @ApiOperation({ summary: 'Get all production plans' })
  findAll(
    @CompanyId() companyId: bigint,
    @Query('siteId') siteId?: string,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('periodMonth') periodMonth?: string,
  ) {
    return this.service.findAll(
      companyId,
      siteId ? parseInt(siteId) : undefined,
      fiscalYear ? parseInt(fiscalYear) : undefined,
      periodMonth ? parseInt(periodMonth) : undefined,
    );
  }

  @Get('vs-actual')
  @Roles('admin', 'fpna_manager', 'production_manager', 'financial_analyst')
  @ApiOperation({ summary: 'Get production vs actual variance report' })
  getVarianceReport(
    @CompanyId() companyId: bigint,
    @Query('siteId') siteId?: string,
    @Query('fiscalYear') fiscalYear?: string,
  ) {
    return this.service.getVarianceReport(
      companyId,
      siteId ? parseInt(siteId) : undefined,
      fiscalYear ? parseInt(fiscalYear) : undefined,
    );
  }

  @Post('save-from-explosion')
  @Roles('admin', 'fpna_manager', 'production_manager')
  @ApiOperation({ summary: 'Save production plan from BOM explosion' })
  saveFromExplosion(
    @CompanyId() companyId: bigint,
    @Body() dto: SaveFromExplosionDto,
  ) {
    return this.service.saveFromExplosion(companyId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'fpna_manager', 'production_manager')
  @ApiOperation({ summary: 'Update a production plan' })
  update(
    @Request() req: any,
    @CompanyId() companyId: bigint,
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductionPlanDto>,
  ) {
    const tenantId = BigInt(req.user.tenantId);
    const userId = BigInt(req.user.id);
    return this.service.update(BigInt(id), companyId, dto, tenantId, userId);
  }

  @Delete(':id')
  @Roles('admin', 'fpna_manager')
  @ApiOperation({ summary: 'Delete a production plan' })
  remove(
    @Request() req: any,
    @CompanyId() companyId: bigint,
    @Param('id') id: string,
  ) {
    const tenantId = BigInt(req.user.tenantId);
    const userId = BigInt(req.user.id);
    return this.service.remove(BigInt(id), companyId, tenantId, userId);
  }
}
