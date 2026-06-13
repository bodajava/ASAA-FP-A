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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationRuleDto } from './dto/create-notification-rule.dto';
import { UpdateNotificationRuleDto } from './dto/update-notification-rule.dto';
import { NotificationRuleResponseDto } from './dto/notification-rule-response.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';
import { NotificationStatus } from '@prisma/client';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ============================================================
  // NOTIFICATION RULES CRUD ENDPOINTS
  // ============================================================

  @Post('rules')
  @ApiOperation({ summary: 'Create a new notification rule' })
  @ApiResponse({ status: 201, type: NotificationRuleResponseDto })
  createRule(
    @Body() dto: CreateNotificationRuleDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<NotificationRuleResponseDto> {
    return this.notificationsService.createRule(
      dto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get('rules')
  @ApiOperation({ summary: 'List all notification rules under the company' })
  @ApiResponse({ status: 200 })
  findAllRules(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Request() req: RequestWithUser,
  ): Promise<{ total: number; data: NotificationRuleResponseDto[] }> {
    return this.notificationsService.findAllRules(
      companyId,
      req.user.tenantId,
      paginationDto,
    );
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get details of a specific notification rule' })
  @ApiResponse({ status: 200, type: NotificationRuleResponseDto })
  findOneRule(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<NotificationRuleResponseDto> {
    return this.notificationsService.findOneRule(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update a notification rule config' })
  @ApiResponse({ status: 200, type: NotificationRuleResponseDto })
  updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationRuleDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<NotificationRuleResponseDto> {
    return this.notificationsService.updateRule(
      BigInt(id),
      dto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete a notification rule' })
  @ApiResponse({ status: 200, type: NotificationRuleResponseDto })
  removeRule(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<NotificationRuleResponseDto> {
    return this.notificationsService.removeRule(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  // ============================================================
  // NOTIFICATION RETRIEVAL & MANAGEMENT ENDPOINTS
  // ============================================================

  @Get()
  @ApiOperation({ summary: 'List all notifications under the company' })
  @ApiQuery({ name: 'status', enum: NotificationStatus, required: false })
  @ApiResponse({ status: 200 })
  findAllNotifications(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Query('status') statusFilter: NotificationStatus | undefined,
    @Request() req: RequestWithUser,
  ): Promise<{ total: number; data: NotificationResponseDto[] }> {
    return this.notificationsService.findAllNotifications(
      companyId,
      req.user.tenantId,
      paginationDto,
      statusFilter,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific notification' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  findOneNotification(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.findOneNotification(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  markAsRead(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }
}
