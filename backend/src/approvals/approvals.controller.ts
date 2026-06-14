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
import { ApprovalsService, ApprovalResponseDto } from './approvals.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { UpdateApprovalStatusDto } from './dto/update-approval-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Approvals')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CFO', 'FP&A Manager', 'Super Admin')
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new approval request' })
  @ApiResponse({ status: 201, description: 'Approval created successfully.' })
  create(
    @Body() createDto: CreateApprovalDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.create(
      createDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all approvals' })
  @ApiResponse({ status: 200, description: 'List of approvals.' })
  findAll(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('status') status?: string,
    @Request() req?: RequestWithUser,
  ) {
    return this.approvalsService.findAll(
      companyId,
      req!.user.tenantId,
      { ...paginationDto, entityType, entityId, status },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get approval details' })
  @ApiResponse({ status: 200, description: 'Approval details.' })
  @ApiResponse({ status: 404, description: 'Approval not found.' })
  findOne(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.findOne(
      BigInt(id),
      req.user.tenantId,
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Approve, reject, or cancel an approval' })
  @ApiResponse({ status: 200, description: 'Approval status updated.' })
  @ApiResponse({ status: 400, description: 'Invalid action or approval not pending.' })
  @ApiResponse({ status: 404, description: 'Approval not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateApprovalStatusDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.updateStatus(
      BigInt(id),
      statusDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an approval' })
  @ApiResponse({ status: 200, description: 'Approval deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Approval not found.' })
  remove(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.remove(
      BigInt(id),
      req.user.tenantId,
      req.user.id,
    );
  }
}
