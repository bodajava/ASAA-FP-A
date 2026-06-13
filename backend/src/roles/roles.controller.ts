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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';
import { Prisma } from '@prisma/client';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  private checkSuperAdmin(user: AuthUser): boolean {
    const role = user.role;
    if (!role) {
      return false;
    }
    if (role.name === 'Super Admin') {
      return true;
    }
    const permissions = role.permissions;
    if (
      permissions &&
      typeof permissions === 'object' &&
      !Array.isArray(permissions)
    ) {
      const permissionsObj = permissions as Record<string, Prisma.JsonValue>;
      if (permissionsObj.superAdmin === true) {
        return true;
      }
    }
    return false;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new role under the current tenant' })
  @ApiResponse({ status: 201, description: 'Role created successfully.' })
  create(
    @Body() createRoleDto: CreateRoleDto,
    @Request() req: RequestWithUser,
  ) {
    return this.rolesService.create(
      createRoleDto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all roles under the current tenant' })
  @ApiResponse({ status: 200, description: 'List of roles.' })
  findAll(@Request() req: RequestWithUser) {
    const isSuper = this.checkSuperAdmin(req.user);
    return this.rolesService.findAll(req.user.tenantId, isSuper);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiResponse({ status: 200, description: 'Role details.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    const isSuper = this.checkSuperAdmin(req.user);
    return this.rolesService.findOne(BigInt(id), req.user.tenantId, isSuper);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Request() req: RequestWithUser,
  ) {
    const isSuper = this.checkSuperAdmin(req.user);
    return this.rolesService.update(
      BigInt(id),
      updateRoleDto,
      req.user.tenantId,
      req.user.id,
      isSuper,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    const isSuper = this.checkSuperAdmin(req.user);
    return this.rolesService.remove(
      BigInt(id),
      req.user.tenantId,
      req.user.id,
      isSuper,
    );
  }
}
