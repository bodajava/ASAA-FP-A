import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Response,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ImportsService } from './imports.service';
import { EnterpriseImportService } from './enterprise-import.service';
import { TemplateGeneratorService } from '../excel-integration/template-generator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
} from 'class-validator';
import {
  Request as ExpressRequest,
  type Response as ExpressResponse,
} from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

export class PreviewImportDto {
  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsString()
  @IsNotEmpty()
  fileContent!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;
}

export class CommitImportDto {
  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsArray()
  @IsNotEmpty()
  rows!: Record<string, unknown>[];
}

export class ErrorCsvDto {
  @IsArray()
  @IsNotEmpty()
  rows!: Array<{
    index: number;
    data: Record<string, unknown>;
    isValid: boolean;
    errors: string[];
  }>;

  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsString()
  @IsOptional()
  type?: 'errors' | 'skipped';
}

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsNumber()
  totalRows!: number;

  @IsString()
  @IsOptional()
  mappingConfig?: string;
}

export class ProcessChunkDto {
  @IsArray()
  @IsNotEmpty()
  rows!: Record<string, string | number | boolean | null>[];

  @IsNumber()
  startRow!: number;
}

@ApiTags('Data Imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('imports')
export class ImportsController {
  constructor(
    private readonly importsService: ImportsService,
    private readonly enterpriseImportService: EnterpriseImportService,
    private readonly templateGenerator: TemplateGeneratorService,
  ) {}

  @Get('sample/:module')
  @ApiOperation({ summary: 'Get sample XLSX template for a module' })
  @ApiHeader({
    name: 'x-company-id',
    description: 'Company ID header (optional, enables reference data in templates)',
    required: false,
  })
  async getSample(
    @Param('module') module: string,
    @CompanyId() companyId: bigint | undefined,
    @Response() res: ExpressResponse,
  ) {
    try {
      const buffer = await this.templateGenerator.generateModuleTemplate(module, companyId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${module}_template.xlsx"`,
      );
      return res.status(HttpStatus.OK).send(buffer);
    } catch {
      // Fallback to CSV if module not found in client schema
      const csv = this.importsService.getSampleCSV(module);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${module}_template.csv"`,
      );
      return res.status(HttpStatus.OK).send(csv);
    }
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'x-company-id',
    description: 'Company ID header is required',
    required: true,
  })
  @ApiOperation({
    summary: 'Preview and validate uploaded data before committing',
  })
  async preview(
    @Body() dto: PreviewImportDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.importsService.preview(
      dto.module,
      dto.fileContent,
      dto.fileName,
      companyId,
      req.user.tenantId,
    );
  }

  @Post('error-csv')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'x-company-id',
    description: 'Company ID header is required',
    required: true,
  })
  @ApiOperation({ summary: 'Generate CSV of error or skipped rows from preview' })
  async generateErrorCsv(
    @Body() dto: ErrorCsvDto,
    @CompanyId() companyId: bigint,
    @Response() res: ExpressResponse,
  ) {
    const csv = this.importsService.generateErrorCsv(
      dto.rows,
      dto.module,
      dto.type ?? 'errors',
    );
    const filename =
      dto.type === 'skipped'
        ? `${dto.module}_skipped_rows.csv`
        : `${dto.module}_error_rows.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(HttpStatus.OK).send(csv);
  }

  @Post('commit')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'x-company-id',
    description: 'Company ID header is required',
    required: true,
  })
  @ApiOperation({ summary: 'Commit valid rows to the database' })
  async commit(
    @Body() dto: CommitImportDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.importsService.commit(
      dto.module,
      dto.rows,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post('jobs')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader({
    name: 'x-company-id',
    description: 'Company ID header is required',
    required: true,
  })
  @ApiOperation({ summary: 'Create a new import job' })
  async createJob(
    @Body() dto: CreateJobDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.enterpriseImportService.createJob({
      companyId,
      userId: req.user.id,
      module: dto.module,
      fileName: dto.fileName,
      totalRows: dto.totalRows,
      mappingConfig: dto.mappingConfig,
    });
  }

  @Post('jobs/:id/chunk')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'x-company-id',
    description: 'Company ID header is required',
    required: true,
  })
  @ApiOperation({ summary: 'Process a chunk of rows for an import job' })
  async processChunk(
    @Param('id') id: string,
    @Body() dto: ProcessChunkDto,
    @CompanyId() companyId: bigint,
  ) {
    const jobId = BigInt(id);
    return this.enterpriseImportService.processChunk(
      jobId,
      companyId,
      dto.rows,
      dto.startRow,
      (_row: Record<string, string | number | boolean | null>, _rowNumber: number) => ({
        valid: true,
        errors: [],
        mapped: _row,
      }),
    );
  }

  @Get('jobs/:id')
  @ApiHeader({
    name: 'x-company-id',
    description: 'Company ID header is required',
    required: true,
  })
  @ApiOperation({ summary: 'Get import job status' })
  async getJobStatus(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
  ) {
    return this.enterpriseImportService.getJobStatus(BigInt(id), companyId);
  }

  @Post('jobs/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'x-company-id',
    description: 'Company ID header is required',
    required: true,
  })
  @ApiOperation({ summary: 'Cancel an import job' })
  async cancelJob(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
  ) {
    return this.enterpriseImportService.cancelJob(BigInt(id), companyId);
  }

  @Post('jobs/:id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'x-company-id',
    description: 'Company ID header is required',
    required: true,
  })
  @ApiOperation({ summary: 'Retry failed rows of an import job' })
  async retryFailedRows(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
  ) {
    return this.enterpriseImportService.retryFailedRows(
      BigInt(id),
      companyId,
    );
  }

  @Get('history')
  @ApiHeader({
    name: 'x-company-id',
    description: 'Company ID header is required',
    required: true,
  })
  @ApiOperation({ summary: 'Get import history' })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getImportHistory(
    @CompanyId() companyId: bigint,
    @Query('module') module?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.enterpriseImportService.getImportHistory(
      companyId,
      module,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('jobs/:id/logs')
  @ApiHeader({
    name: 'x-company-id',
    description: 'Company ID header is required',
    required: true,
  })
  @ApiOperation({ summary: 'Get import logs for a job' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getImportLogs(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.enterpriseImportService.getImportLogs(
      BigInt(id),
      companyId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Delete('history/cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'x-company-id',
    description: 'Company ID header is required',
    required: true,
  })
  @ApiOperation({ summary: 'Cleanup old completed import jobs' })
  @ApiQuery({ name: 'daysOld', required: false })
  async cleanupOldJobs(
    @CompanyId() companyId: bigint,
    @Query('daysOld') daysOld?: string,
  ) {
    return this.enterpriseImportService.cleanupOldJobs(
      companyId,
      daysOld ? parseInt(daysOld, 10) : 30,
    );
  }
}
