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
  ApiQuery,
} from '@nestjs/swagger';
import { RawMaterialPricesService } from './raw-material-prices.service';
import { CreateRawMaterialPriceDto } from './dto/create-raw-material-price.dto';
import { UpdateRawMaterialPricesDto } from './dto/update-raw-material-prices.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Raw Material Prices')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('raw-material-prices')
export class RawMaterialPricesController {
  constructor(
    private readonly rawMaterialPricesService: RawMaterialPricesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new raw material price entry' })
  @ApiResponse({
    status: 201,
    description: 'Raw material price created successfully.',
  })
  create(
    @Body() dto: CreateRawMaterialPriceDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.rawMaterialPricesService.create(
      dto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all raw material prices under the company' })
  @ApiResponse({ status: 200, description: 'List of raw material prices.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  findAll(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.rawMaterialPricesService.findAll(
      companyId,
      req.user.tenantId,
      {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        search,
      },
      dateFrom,
      dateTo,
    );
  }

  @Get('latest/:materialId')
  @ApiOperation({ summary: 'Get the latest price for a specific material' })
  @ApiResponse({
    status: 200,
    description: 'Latest raw material price.',
  })
  @ApiResponse({ status: 404, description: 'No price found.' })
  getLatestByMaterial(
    @Param('materialId') materialId: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.rawMaterialPricesService.getLatestByMaterial(
      BigInt(materialId),
      companyId,
      req.user.tenantId,
    );
  }

  @Get('history/:materialId')
  @ApiOperation({
    summary: 'Get price history for a material with optional date range',
  })
  @ApiResponse({ status: 200, description: 'Price history.' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  getHistory(
    @Param('materialId') materialId: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.rawMaterialPricesService.getHistory(
      BigInt(materialId),
      companyId,
      req.user.tenantId,
      dateFrom,
      dateTo,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a raw material price by ID' })
  @ApiResponse({ status: 200, description: 'Raw material price details.' })
  @ApiResponse({ status: 404, description: 'Raw material price not found.' })
  findOne(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.rawMaterialPricesService.findOne(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a raw material price' })
  @ApiResponse({
    status: 200,
    description: 'Raw material price updated successfully.',
  })
  @ApiResponse({ status: 404, description: 'Raw material price not found.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRawMaterialPricesDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.rawMaterialPricesService.update(
      BigInt(id),
      dto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a raw material price' })
  @ApiResponse({
    status: 200,
    description: 'Raw material price deleted successfully.',
  })
  @ApiResponse({ status: 404, description: 'Raw material price not found.' })
  remove(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.rawMaterialPricesService.remove(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }
}
