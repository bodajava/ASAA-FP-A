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
import {
  ActualImportsService,
  ActualImportResponseDto,
  MappedRowResult,
} from './actual-imports.service';
import { CreateActualImportDto } from './dto/create-actual-import.dto';
import { UpdateActualImportDto } from './dto/update-actual-import.dto';
import { PreviewActualImportDto } from './dto/preview-actual-import.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Actual Data Imports')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('actual-imports')
export class ActualImportsController {
  constructor(private readonly actualImportsService: ActualImportsService) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview mapped spreadsheet or CSV rows before final import',
  })
  @ApiResponse({
    status: 200,
    description: 'Preview of mapped rows with status and resolved entity IDs.',
  })
  preview(
    @Body() previewDto: PreviewActualImportDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<MappedRowResult[]> {
    return this.actualImportsService.preview(
      previewDto,
      companyId,
      req.user.tenantId,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new actual import and import its lines' })
  @ApiResponse({
    status: 201,
    description: 'Actual import created successfully.',
  })
  create(
    @Body() createDto: CreateActualImportDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ActualImportResponseDto> {
    return this.actualImportsService.create(
      createDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all actual data imports under the company' })
  @ApiResponse({ status: 200, description: 'List of actual imports.' })
  findAll(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.actualImportsService.findAll(
      companyId,
      req.user.tenantId,
      paginationDto,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get details of a specific actual import including its lines',
  })
  @ApiResponse({ status: 200, description: 'Actual import details.' })
  @ApiResponse({ status: 404, description: 'Actual import not found.' })
  findOne(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ActualImportResponseDto> {
    return this.actualImportsService.findOne(
      BigInt(id),
      companyId,
      req.user.tenantId,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update metadata or lines of an unposted actual import',
  })
  @ApiResponse({
    status: 200,
    description: 'Actual import updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Cannot modify posted imports.' })
  @ApiResponse({ status: 404, description: 'Actual import not found.' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateActualImportDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ActualImportResponseDto> {
    return this.actualImportsService.update(
      BigInt(id),
      updateDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an unposted actual import and all its lines',
  })
  @ApiResponse({
    status: 200,
    description: 'Actual import deleted successfully.',
  })
  @ApiResponse({ status: 400, description: 'Cannot delete posted imports.' })
  @ApiResponse({ status: 404, description: 'Actual import not found.' })
  remove(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ActualImportResponseDto> {
    return this.actualImportsService.remove(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Validate referenced entity IDs under the active company and update status',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation complete. Status updated to validated or failed.',
  })
  @ApiResponse({ status: 404, description: 'Actual import not found.' })
  validateImport(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ActualImportResponseDto> {
    return this.actualImportsService.validateImport(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lock and post actual import lines. Status becomes posted.',
  })
  @ApiResponse({
    status: 200,
    description: 'Actual import posted successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot post failed or unvalidated imports.',
  })
  @ApiResponse({ status: 404, description: 'Actual import not found.' })
  postImport(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ): Promise<ActualImportResponseDto> {
    return this.actualImportsService.postImport(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }
}
