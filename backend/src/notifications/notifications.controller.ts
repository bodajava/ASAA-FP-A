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
  BadRequestException,
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
import { AlertsService } from './alerts.service';
import { CreateNotificationRuleDto } from './dto/create-notification-rule.dto';
import { UpdateNotificationRuleDto } from './dto/update-notification-rule.dto';
import { NotificationRuleResponseDto } from './dto/notification-rule-response.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { AlertResponseDto } from './dto/alert-response.dto';
import { BulkAlertsDto } from './dto/bulk-alerts.dto';
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
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly alertsService: AlertsService,
  ) {}

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

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Returns { count: number }' })
  getNotificationUnreadCount(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<{ count: number }> {
    return this.notificationsService
      .getUnreadCount(companyId, req.user.tenantId)
      .then((count) => ({ count }));
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'Returns { count: number }' })
  markAllNotificationsAsRead(
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<{ count: number }> {
    return this.notificationsService.markAllAsRead(
      companyId,
      req.user.tenantId,
    );
  }

  // ============================================================
  // ALERTS ENDPOINTS
  // ============================================================

  @Get('alerts')
  @ApiOperation({ summary: 'List alerts with filters' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'isRead', required: false })
  @ApiResponse({ status: 200 })
  findAllAlerts(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('severity') severity?: string,
    @Query('isRead') isRead?: string,
  ) {
    return this.alertsService.findAll(companyId, paginationDto, {
      category,
      priority,
      severity,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      search: paginationDto.search,
    });
  }

  @Get('alerts/unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get unread alert count' })
  @ApiResponse({ status: 200, description: 'Returns { count: number }' })
  getAlertUnreadCount(
    @CompanyId() companyId: bigint,
  ): Promise<{ count: number }> {
    return this.alertsService
      .getUnreadCount(companyId)
      .then((count) => ({ count }));
  }

  @Patch('alerts/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all alerts as read' })
  @ApiResponse({ status: 200, description: 'Returns { count: number }' })
  markAllAlertsAsRead(
    @CompanyId() companyId: bigint,
  ): Promise<{ count: number }> {
    return this.alertsService.markAllAsRead(companyId);
  }

  @Patch('alerts/bulk-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark multiple alerts as read' })
  @ApiResponse({ status: 200, description: 'Returns { count: number }' })
  bulkMarkAlertsAsRead(
    @Body() dto: BulkAlertsDto,
    @CompanyId() companyId: bigint,
  ): Promise<{ count: number }> {
    return this.alertsService.bulkMarkAsRead(dto.ids, companyId);
  }

  @Patch('alerts/bulk-archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive multiple alerts' })
  @ApiResponse({ status: 200, description: 'Returns { count: number }' })
  bulkArchiveAlerts(
    @Body() dto: BulkAlertsDto,
    @CompanyId() companyId: bigint,
  ): Promise<{ count: number }> {
    return this.alertsService.bulkArchive(dto.ids, companyId);
  }

  @Delete('alerts/bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete multiple alerts' })
  @ApiResponse({ status: 200, description: 'Returns { count: number }' })
  bulkDeleteAlerts(
    @Body() dto: BulkAlertsDto,
    @CompanyId() companyId: bigint,
  ): Promise<{ count: number }> {
    return this.alertsService.bulkDelete(dto.ids, companyId);
  }

  @Post('alerts/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger alert generation check' })
  @ApiResponse({ status: 200, description: 'Alert check triggered' })
  async triggerAlertCheck(
    @CompanyId() companyId: bigint,
  ): Promise<{ success: boolean }> {
    await this.alertsService.checkAndGenerateAlerts(companyId);
    return { success: true };
  }

  // ============================================================
  // PARAMETRIC NOTIFICATION ENDPOINTS
  // ============================================================

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific notification' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  findOneNotification(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<NotificationResponseDto> {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('Notification ID must be a numeric string');
    }
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
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('Notification ID must be a numeric string');
    }
    return this.notificationsService.markAsRead(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  // ============================================================
  // PARAMETRIC ALERT ENDPOINTS
  // ============================================================

  @Patch('alerts/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an alert as read' })
  @ApiResponse({ status: 200, type: AlertResponseDto })
  markAlertAsRead(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
  ): Promise<AlertResponseDto> {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('Alert ID must be a numeric string');
    }
    return this.alertsService.markAsRead(BigInt(id), companyId);
  }

  @Patch('alerts/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive an alert' })
  @ApiResponse({ status: 200, type: AlertResponseDto })
  archiveAlert(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
  ): Promise<AlertResponseDto> {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('Alert ID must be a numeric string');
    }
    return this.alertsService.archive(BigInt(id), companyId);
  }

  @Delete('alerts/:id')
  @ApiOperation({ summary: 'Delete an alert' })
  @ApiResponse({ status: 200, type: AlertResponseDto })
  removeAlert(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
  ): Promise<AlertResponseDto> {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('Alert ID must be a numeric string');
    }
    return this.alertsService.remove(BigInt(id), companyId);
  }
}
