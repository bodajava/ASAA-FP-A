import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventorySnapshotDto } from './dto/create-inventory-snapshot.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CompanyId } from '../common/decorators/company.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Post('snapshots')
  @Roles('admin', 'fpna_manager', 'branch_manager', 'production_manager')
  @ApiOperation({ summary: 'Record inventory snapshot' })
  recordSnapshot(
    @CompanyId() companyId: bigint,
    @Body() dto: CreateInventorySnapshotDto,
  ) {
    return this.service.recordSnapshot(companyId, dto);
  }

  @Get('snapshots')
  @Roles(
    'admin',
    'fpna_manager',
    'branch_manager',
    'production_manager',
    'financial_analyst',
  )
  @ApiOperation({ summary: 'Get inventory snapshots' })
  getSnapshots(
    @CompanyId() companyId: bigint,
    @Query('siteId') siteId?: string,
    @Query('productId') productId?: string,
    @Query('materialId') materialId?: string,
    @Query('date') date?: string,
  ) {
    return this.service.getSnapshots(
      companyId,
      siteId ? parseInt(siteId) : undefined,
      productId,
      materialId,
      date,
    );
  }

  @Get('coverage')
  @Roles('admin', 'fpna_manager', 'branch_manager', 'financial_analyst')
  @ApiOperation({ summary: 'Get inventory coverage days' })
  getCoverageDays(
    @CompanyId() companyId: bigint,
    @Query('siteId') siteId?: string,
  ) {
    return this.service.getCoverageDays(
      companyId,
      siteId ? parseInt(siteId) : undefined,
    );
  }

  @Get('slow-moving')
  @Roles('admin', 'fpna_manager', 'branch_manager', 'financial_analyst')
  @ApiOperation({ summary: 'Get slow moving items' })
  getSlowMovingItems(
    @CompanyId() companyId: bigint,
    @Query('siteId') siteId?: string,
  ) {
    return this.service.getSlowMovingItems(
      companyId,
      siteId ? parseInt(siteId) : undefined,
    );
  }
}
