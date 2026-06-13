import {
  Controller,
  Get,
  Param,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'List all audit logs under the user tenant' })
  @ApiResponse({ status: 200 })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Request() req: RequestWithUser,
  ): Promise<{ total: number; data: AuditLogResponseDto[] }> {
    return this.auditLogsService.findAll(req.user.tenantId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific audit log record' })
  @ApiResponse({ status: 200, type: AuditLogResponseDto })
  findOne(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<AuditLogResponseDto> {
    return this.auditLogsService.findOne(BigInt(id), req.user.tenantId);
  }
}
