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
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Cost Centers')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cost-centers')
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new cost center' })
  @ApiResponse({
    status: 201,
    description: 'Cost center created successfully.',
  })
  create(
    @Body() createCostCenterDto: CreateCostCenterDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.costCentersService.create(
      createCostCenterDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all cost centers under the company' })
  @ApiResponse({ status: 200, description: 'List of cost centers.' })
  findAll(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.costCentersService.findAll(
      companyId,
      req.user.tenantId,
      paginationDto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a cost center by ID' })
  @ApiResponse({ status: 200, description: 'Cost center details.' })
  @ApiResponse({ status: 404, description: 'Cost center not found.' })
  findOne(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.costCentersService.findOne(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a cost center' })
  @ApiResponse({
    status: 200,
    description: 'Cost center updated successfully.',
  })
  @ApiResponse({ status: 404, description: 'Cost center not found.' })
  update(
    @Param('id') id: string,
    @Body() updateCostCenterDto: UpdateCostCenterDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.costCentersService.update(
      BigInt(id),
      updateCostCenterDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a cost center' })
  @ApiResponse({
    status: 200,
    description: 'Cost center deleted successfully.',
  })
  @ApiResponse({ status: 404, description: 'Cost center not found.' })
  remove(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.costCentersService.remove(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }
}
