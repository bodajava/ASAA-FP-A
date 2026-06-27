import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Super Admin', 'Admin')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company under the current tenant' })
  @ApiResponse({ status: 201, description: 'Company created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(
    @Body() createCompanyDto: CreateCompanyDto,
    @Request() req: RequestWithUser,
  ) {
    return this.companiesService.create(
      createCompanyDto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all companies under the current tenant' })
  @ApiResponse({ status: 200, description: 'List of companies.' })
  findAll(@Request() req: RequestWithUser) {
    return this.companiesService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a company by ID under the current tenant' })
  @ApiResponse({
    status: 200,
    description: 'Company details.',
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found or access denied.',
  })
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.companiesService.findOne(BigInt(id), req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company by ID under the current tenant' })
  @ApiResponse({ status: 200, description: 'Company updated successfully.' })
  @ApiResponse({
    status: 404,
    description: 'Company not found or access denied.',
  })
  update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @Request() req: RequestWithUser,
  ) {
    return this.companiesService.update(
      BigInt(id),
      updateCompanyDto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a company by ID under the current tenant' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully.' })
  @ApiResponse({
    status: 404,
    description: 'Company not found or access denied.',
  })
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.companiesService.remove(
      BigInt(id),
      req.user.tenantId,
      req.user.id,
    );
  }
}
