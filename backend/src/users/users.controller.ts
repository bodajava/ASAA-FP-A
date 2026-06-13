import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Create a new user under the current tenant' })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.usersService.create(
      createUserDto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'List all users under the current tenant' })
  @ApiResponse({ status: 200 })
  @ApiQuery({
    name: 'status',
    enum: UserStatus,
    required: false,
    description: 'Filter by user status',
  })
  @ApiQuery({
    name: 'roleId',
    type: String,
    required: false,
    description: 'Filter by role ID',
  })
  findAll(
    @Request() req: RequestWithUser,
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: UserStatus,
    @Query('roleId') roleId?: string,
  ): Promise<{ total: number; data: UserResponseDto[] }> {
    return this.usersService.findAll(req.user.tenantId, {
      ...paginationDto,
      status,
      roleId: roleId ? BigInt(roleId) : undefined,
    });
  }

  @Get(':id')
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(BigInt(id), req.user.tenantId);
  }

  @Patch(':id')
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.usersService.update(
      BigInt(id),
      updateUserDto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  remove(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.usersService.remove(BigInt(id), req.user.tenantId, req.user.id);
  }

  @Patch(':id/status')
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  @ApiResponse({ status: 200, description: 'User status updated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
    @Request() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.usersService.updateStatus(
      BigInt(id),
      status,
      req.user.tenantId,
      req.user.id,
    );
  }
}
