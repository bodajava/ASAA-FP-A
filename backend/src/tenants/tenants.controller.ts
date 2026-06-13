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
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant details' })
  @ApiResponse({ status: 200, description: 'Current tenant details.' })
  findCurrent(@Request() req: RequestWithUser) {
    return this.tenantsService.findCurrentTenant(req.user.tenantId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List all available subscription plans' })
  @ApiResponse({ status: 200, description: 'List of all active plans.' })
  findPlans() {
    return this.tenantsService.findPlans();
  }

  @Patch('current/plan')
  @ApiOperation({ summary: 'Upgrade current tenant plan' })
  @ApiResponse({
    status: 200,
    description: 'Tenant plan updated successfully.',
  })
  updateCurrentPlan(
    @Body() body: { planId: string },
    @Request() req: RequestWithUser,
  ) {
    return this.tenantsService.update(
      req.user.tenantId,
      { planId: body.planId },
      req.user.id,
    );
  }

  @Post()
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully.' })
  create(
    @Body() createTenantDto: CreateTenantDto,
    @Request() req: RequestWithUser,
  ) {
    return this.tenantsService.create(createTenantDto, req.user.id);
  }

  @Get()
  @Roles('Super Admin')
  @ApiOperation({ summary: 'List all tenants' })
  @ApiResponse({ status: 200, description: 'List of all tenants.' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Get a tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant details.' })
  @ApiResponse({ status: 404, description: 'Tenant not found.' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(BigInt(id));
  }

  @Patch(':id')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Update a tenant' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully.' })
  @ApiResponse({ status: 404, description: 'Tenant not found.' })
  update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @Request() req: RequestWithUser,
  ) {
    return this.tenantsService.update(BigInt(id), updateTenantDto, req.user.id);
  }

  @Delete(':id')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Delete a tenant' })
  @ApiResponse({ status: 200, description: 'Tenant deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Tenant not found.' })
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.tenantsService.remove(BigInt(id), req.user.id);
  }
}
