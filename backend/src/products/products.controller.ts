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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Products')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  create(
    @Body() createProductDto: CreateProductDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.productsService.create(
      createProductDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all products under the company' })
  @ApiResponse({ status: 200, description: 'List of products.' })
  findAll(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.productsService.findAll(
      companyId,
      req.user.tenantId,
      paginationDto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Product details.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  findOne(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.productsService.findOne(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.productsService.update(
      BigInt(id),
      updateProductDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  remove(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.productsService.remove(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }
}
