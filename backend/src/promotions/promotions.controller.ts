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
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionResponseDto } from './dto/promotion-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Promotions')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new promotion' })
  @ApiResponse({ status: 201, description: 'Promotion created successfully.' })
  create(
    @Body() createPromotionDto: CreatePromotionDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.create(
      createPromotionDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all promotions under the company' })
  @ApiResponse({ status: 200, description: 'List of promotions.' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status (true/false)',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    description: 'Filter by product ID',
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    description: 'Filter by customer ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter promotions starting on or after this date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter promotions starting on or before this date (ISO 8601)',
  })
  findAll(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
    @Query() paginationDto: PaginationDto,
    @Query('isActive') isActive?: string,
    @Query('productId') productId?: string,
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.promotionsService.findAll(companyId, req.user.tenantId, {
      ...paginationDto,
      isActive,
      productId,
      customerId,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a promotion by ID' })
  @ApiResponse({ status: 200, description: 'Promotion details.' })
  @ApiResponse({ status: 404, description: 'Promotion not found.' })
  findOne(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.findOne(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a promotion' })
  @ApiResponse({ status: 200, description: 'Promotion updated successfully.' })
  @ApiResponse({ status: 404, description: 'Promotion not found.' })
  update(
    @Param('id') id: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.update(
      BigInt(id),
      updatePromotionDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a promotion' })
  @ApiResponse({ status: 200, description: 'Promotion deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Promotion not found.' })
  remove(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.remove(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }
}
