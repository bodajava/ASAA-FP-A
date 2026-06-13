import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { IsString, IsNotEmpty, IsArray } from 'class-validator';
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
  fileContent!: string; // Base64

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

@ApiTags('Data Imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get('sample/:module')
  @ApiOperation({ summary: 'Get sample CSV template for a module' })
  getSample(@Param('module') module: string, @Response() res: ExpressResponse) {
    const csv = this.importsService.getSampleCSV(module);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${module}_template.csv"`,
    );
    return res.status(HttpStatus.OK).send(csv);
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
}
