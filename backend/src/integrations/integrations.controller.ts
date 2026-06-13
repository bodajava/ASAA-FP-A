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
} from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { CreateMappingDto } from './dto/create-mapping.dto';
import { UpdateMappingDto } from './dto/update-mapping.dto';
import { TestConnectionDto } from './dto/test-connection.dto';
import { SyncTriggerDto } from './dto/sync-trigger.dto';
import {
  ConnectionResponseDto,
  MappingResponseDto,
} from './dto/integrations-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RequiredPlan } from '../common/decorators/required-plan.decorator';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Integrations')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@RequiredPlan('Business')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  // ============================================================
  // CONNECTION ENDPOINTS
  // ============================================================

  @Post('connections')
  @ApiOperation({ summary: 'Create a new integration connection' })
  @ApiResponse({ status: 201, type: ConnectionResponseDto })
  createConnection(
    @Body() dto: CreateConnectionDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ConnectionResponseDto> {
    return this.integrationsService.createConnection(
      dto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get('connections')
  @ApiOperation({ summary: 'List all connections under the company' })
  @ApiResponse({ status: 200 })
  findAllConnections(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Request() req: RequestWithUser,
  ): Promise<{ total: number; data: ConnectionResponseDto[] }> {
    return this.integrationsService.findAllConnections(
      companyId,
      req.user.tenantId,
      paginationDto,
    );
  }

  @Get('connections/:id')
  @ApiOperation({ summary: 'Get details of a specific connection' })
  @ApiResponse({ status: 200, type: ConnectionResponseDto })
  findOneConnection(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ConnectionResponseDto> {
    return this.integrationsService.findOneConnection(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch('connections/:id')
  @ApiOperation({ summary: 'Update integration connection parameters' })
  @ApiResponse({ status: 200, type: ConnectionResponseDto })
  updateConnection(
    @Param('id') id: string,
    @Body() dto: UpdateConnectionDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ConnectionResponseDto> {
    return this.integrationsService.updateConnection(
      BigInt(id),
      dto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete('connections/:id')
  @ApiOperation({ summary: 'Delete an integration connection' })
  @ApiResponse({ status: 200, type: ConnectionResponseDto })
  removeConnection(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ConnectionResponseDto> {
    return this.integrationsService.removeConnection(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post('connections/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test an integration connection config on-the-fly' })
  @ApiResponse({ status: 200 })
  testConnection(
    @Body() dto: TestConnectionDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.integrationsService.testConnection(
      dto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  // ============================================================
  // IMPORT MAPPING ENDPOINTS
  // ============================================================

  @Post('mappings')
  @ApiOperation({ summary: 'Create a new import mapping template' })
  @ApiResponse({ status: 201, type: MappingResponseDto })
  createMapping(
    @Body() dto: CreateMappingDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<MappingResponseDto> {
    return this.integrationsService.createMapping(
      dto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get('mappings')
  @ApiOperation({ summary: 'List all mappings under the company' })
  @ApiResponse({ status: 200 })
  findAllMappings(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Request() req: RequestWithUser,
  ): Promise<{ total: number; data: MappingResponseDto[] }> {
    return this.integrationsService.findAllMappings(
      companyId,
      req.user.tenantId,
      paginationDto,
    );
  }

  @Get('mappings/:id')
  @ApiOperation({ summary: 'Get details of a specific mapping template' })
  @ApiResponse({ status: 200, type: MappingResponseDto })
  findOneMapping(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<MappingResponseDto> {
    return this.integrationsService.findOneMapping(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch('mappings/:id')
  @ApiOperation({ summary: 'Update an import mapping template' })
  @ApiResponse({ status: 200, type: MappingResponseDto })
  updateMapping(
    @Param('id') id: string,
    @Body() dto: UpdateMappingDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<MappingResponseDto> {
    return this.integrationsService.updateMapping(
      BigInt(id),
      dto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete('mappings/:id')
  @ApiOperation({ summary: 'Delete an import mapping template' })
  @ApiResponse({ status: 200, type: MappingResponseDto })
  removeMapping(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<MappingResponseDto> {
    return this.integrationsService.removeMapping(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  // ============================================================
  // SYNC ENDPOINTS
  // ============================================================

  @Post('connections/:id/full-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger full master data sync from Oracle',
  })
  @ApiResponse({ status: 200 })
  fullSync(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.integrationsService.fullSyncMasterData(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger manual sync to fetch and validate actuals',
  })
  @ApiResponse({ status: 200 })
  triggerManualSync(
    @Body() dto: SyncTriggerDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<{
    importId: string;
    status: string;
    recordsSynced: number;
    message: string;
  }> {
    return this.integrationsService.triggerManualSync(
      dto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }
}
