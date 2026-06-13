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
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Product Categories')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product category' })
  @ApiResponse({ status: 201, description: 'Category created successfully.' })
  create(
    @Body() createProductCategoryDto: CreateProductCategoryDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.productCategoriesService.create(
      createProductCategoryDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all product categories under the company' })
  @ApiResponse({ status: 200, description: 'List of categories.' })
  findAll(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.productCategoriesService.findAll(
      companyId,
      req.user.tenantId,
      paginationDto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product category by ID' })
  @ApiResponse({ status: 200, description: 'Category details.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findOne(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.productCategoriesService.findOne(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  update(
    @Param('id') id: string,
    @Body() updateProductCategoryDto: UpdateProductCategoryDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.productCategoriesService.update(
      BigInt(id),
      updateProductCategoryDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  remove(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.productCategoriesService.remove(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }
}
