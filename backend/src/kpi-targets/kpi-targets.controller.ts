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
import { KpiTargetsService } from './kpi-targets.service';
import { CreateKpiTargetDto } from './dto/create-kpi-target.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CompanyId } from '../common/decorators/company.decorator';

@ApiTags('KPI Targets')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kpi-targets')
export class KpiTargetsController {
  constructor(private readonly service: KpiTargetsService) {}

  @Post()
  @Roles('admin', 'fpna_manager')
  @ApiOperation({ summary: 'Create a KPI target' })
  create(
    @Request() req: any,
    @CompanyId() companyId: bigint,
    @Body() dto: CreateKpiTargetDto,
  ) {
    return this.service.create(companyId, BigInt(req.user.id), dto);
  }

  @Get()
  @Roles('admin', 'fpna_manager', 'financial_analyst', 'viewer')
  @ApiOperation({ summary: 'Get all KPI targets' })
  findAll(
    @CompanyId() companyId: bigint,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('category') category?: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.service.findAll(
      companyId,
      fiscalYear ? parseInt(fiscalYear) : undefined,
      category,
      siteId ? parseInt(siteId) : undefined,
    );
  }

  @Patch(':id')
  @Roles('admin', 'fpna_manager')
  @ApiOperation({ summary: 'Update a KPI target' })
  update(
    @CompanyId() companyId: bigint,
    @Param('id') id: string,
    @Body() dto: Partial<CreateKpiTargetDto>,
  ) {
    return this.service.update(BigInt(id), companyId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a KPI target' })
  remove(@CompanyId() companyId: bigint, @Param('id') id: string) {
    return this.service.remove(BigInt(id), companyId);
  }
}
