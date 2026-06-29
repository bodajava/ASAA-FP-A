/**
 * Excel Integration Controller
 *
 * REST API endpoints for the Excel-first import system.
 * All routes require authentication and x-company-id header.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Headers,
  Res,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { ExcelIntegrationService } from './excel-integration.service';
import { TemplateGeneratorService } from './template-generator.service';
import { ClientWorkbookImportService } from './client-workbook-import.service';
import {
  WorkbookAnalysis,
  ErpModuleMapping,
  SheetValidationResult,
  ImportExecutionResult,
  ImportPlan,
} from './types/excel-integration.types';

const ALLOWED_EXTENSIONS = /\.(xlsx|xls|csv)$/i;
const ALLOWED_MIMETYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'text/x-csv',
  'application/x-csv',
];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

function multerConfig() {
  return {
    storage: memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (
      _req: Express.Request,
      file: MulterFile,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      const ext = file.originalname.toLowerCase();
      if (ext.endsWith('.numbers')) {
        cb(
          new BadRequestException(
            'Apple Numbers files (.numbers) are not supported. Please export your spreadsheet as CSV or Excel (.xlsx) before uploading.',
          ),
          false,
        );
        return;
      }
      if (!ALLOWED_EXTENSIONS.test(ext)) {
        cb(
          new BadRequestException(
            'This file type is not supported. Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.',
          ),
          false,
        );
        return;
      }
      cb(null, true);
    },
  };
}

@Controller('api/v1/excel-integration')
export class ExcelIntegrationController {
  constructor(
    private readonly service: ExcelIntegrationService,
    private readonly templateGenerator: TemplateGeneratorService,
    private readonly clientWorkbookImport: ClientWorkbookImportService,
  ) {}

  /* ─── POST /analyze — Analyze workbook structure ────────────────────── */

  @Post('analyze')
  @UseInterceptors(FileInterceptor('file', multerConfig()))
  async analyze(@UploadedFile() file: MulterFile): Promise<WorkbookAnalysis> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const ext = file.originalname.toLowerCase();
    if (!ext.match(/\.(xlsx|xls|csv)$/)) {
      throw new BadRequestException(
        'This file type is not supported. Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.',
      );
    }

    return this.service.analyzeWorkbook(file.buffer, file.originalname);
  }

  /* ─── POST /map — Analyze + map to ERP modules ─────────────────────── */

  @Post('map')
  @UseInterceptors(FileInterceptor('file', multerConfig()))
  async mapToModules(@UploadedFile() file: MulterFile): Promise<{
    analysis: WorkbookAnalysis;
    mappings: ErpModuleMapping[];
    warnings: any[];
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const analysis = this.service.analyzeWorkbook(
      file.buffer,
      file.originalname,
    );
    const { mappings, warnings } = this.service.mapToModules(analysis);
    analysis.warnings.push(...warnings);

    return { analysis, mappings, warnings };
  }

  /* ─── POST /validate — Analyze + validate data ─────────────────────── */

  @Post('validate')
  @UseInterceptors(FileInterceptor('file', multerConfig()))
  async validate(@UploadedFile() file: MulterFile): Promise<{
    analysis: WorkbookAnalysis;
    validations: SheetValidationResult[];
    summary: any;
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const analysis = this.service.analyzeWorkbook(
      file.buffer,
      file.originalname,
    );
    const validations = this.service.validateWorkbook(file.buffer, analysis);

    const summary = {
      isValid: validations.every((v) => v.errors.length === 0),
      totalRows: validations.reduce((sum, v) => sum + v.totalRows, 0),
      validRows: validations.reduce((sum, v) => sum + v.validRows, 0),
      totalErrors: validations.reduce((sum, v) => sum + v.errors.length, 0),
      totalWarnings: validations.reduce((sum, v) => sum + v.warnings.length, 0),
      totalDuplicates: validations.reduce((sum, v) => sum + v.duplicateRows, 0),
      sheets: validations.map((v) => ({
        name: v.sheetName,
        valid: v.errors.length === 0,
        errors: v.errors.length,
        warnings: v.warnings.length,
        duplicates: v.duplicateRows,
      })),
    };

    return { analysis, validations, summary };
  }

  /* ─── POST /plan — Build import plan ────────────────────────────────── */

  @Post('plan')
  @UseInterceptors(FileInterceptor('file', multerConfig()))
  async plan(@UploadedFile() file: MulterFile): Promise<{
    analysis: WorkbookAnalysis;
    mappings: ErpModuleMapping[];
    validations: SheetValidationResult[];
    importPlan: ImportPlan;
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const analysis = this.service.analyzeWorkbook(
      file.buffer,
      file.originalname,
    );
    const { mappings } = this.service.mapToModules(analysis);
    const validations = this.service.validateWorkbook(file.buffer, analysis);
    const importPlan = this.service.buildImportPlan(
      analysis,
      mappings,
      validations,
    );

    return { analysis, mappings, validations, importPlan };
  }

  /* ─── POST /import — Full pipeline: analyze + map + validate + import ── */

  @Post('import')
  @UseInterceptors(FileInterceptor('file', multerConfig()))
  @HttpCode(HttpStatus.OK)
  async import(
    @UploadedFile() file: MulterFile,
    @Headers('x-company-id') companyIdHeader: string,
    @Body()
    body: { dryRun?: string; skipErrors?: string; columnOverrides?: string },
    @Req() req: any,
  ): Promise<{
    analysis: WorkbookAnalysis;
    mappings: ErpModuleMapping[];
    validations: SheetValidationResult[];
    importPlan: ImportPlan;
    importResult: ImportExecutionResult;
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const companyId = parseInt(companyIdHeader, 10);
    if (isNaN(companyId)) {
      throw new BadRequestException('x-company-id header is required');
    }

    const dryRun = body.dryRun === 'true';
    const skipErrors = body.skipErrors === 'true';
    let userColumnOverrides: Record<string, Record<string, string>> | undefined;

    if (body.columnOverrides) {
      try {
        userColumnOverrides = JSON.parse(body.columnOverrides);
      } catch {
        throw new BadRequestException('columnOverrides must be valid JSON');
      }
    }

    const userId = req?.user?.id ? BigInt(req.user.id) : null;

    const result = await this.service.fullImport(
      file.buffer,
      file.originalname,
      companyId,
      { dryRun, skipErrors, userColumnOverrides, userId },
    );

    return {
      analysis: result.analysis,
      mappings: result.mappings,
      validations: result.validations,
      importPlan: result.importPlan,
      importResult: result.importResult,
    };
  }

  /* ─── POST /client-workbook/preview — Preview client workbook import ── */

  @Post('client-workbook/preview')
  @UseInterceptors(FileInterceptor('file', multerConfig()))
  async previewClientWorkbook(@UploadedFile() file: MulterFile) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.clientWorkbookImport.preview(file.buffer, file.originalname);
  }

  /* ─── POST /client-workbook/import — Import client workbook data ───── */

  @Post('client-workbook/import')
  @UseInterceptors(FileInterceptor('file', multerConfig()))
  @HttpCode(HttpStatus.OK)
  async importClientWorkbook(
    @UploadedFile() file: MulterFile,
    @Headers('x-company-id') companyIdHeader: string,
    @Req() req: Request & { user?: any },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const companyId = parseInt(companyIdHeader, 10);
    if (isNaN(companyId)) {
      throw new BadRequestException('x-company-id header is required');
    }

    // Resolve user ID from request, fallback to admin (ID 4) if not found in auth context
    const userId = req.user?.id ? BigInt(req.user.id) : BigInt(4);

    return this.clientWorkbookImport.importWorkbook(
      file.buffer,
      file.originalname,
      BigInt(companyId),
      userId,
    );
  }

  /* ─── GET /modules — List available ERP modules ─────────────────────── */

  @Get('modules')
  getModules(): Array<{
    key: string;
    description: string;
    targetTable: string;
  }> {
    return this.service.getAvailableModules();
  }

  /* ─── GET /dependencies — Get module dependency graph ───────────────── */

  @Get('dependencies')
  getDependencies(): Record<string, string[]> {
    return this.service.getDependencyGraph();
  }

  /* ─── GET /templates/client-workbook — Download full workbook template ── */

  @Get('templates/client-workbook')
  async downloadClientWorkbook(
    @Res() res: Response,
    @Headers('x-company-id') companyIdHeader?: string,
  ) {
    const companyId = companyIdHeader
      ? parseInt(companyIdHeader, 10)
      : undefined;
    const buffer = await this.templateGenerator.generateFullWorkbook(
      !isNaN(companyId ?? NaN) ? BigInt(companyId!) : undefined,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Harvest_Workbook_Template.xlsx"',
    );
    return res.status(HttpStatus.OK).send(buffer);
  }

  /* ─── GET /templates/:module — Download module-specific template ──── */

  @Get('templates/:module')
  async downloadModuleTemplate(
    @Param('module') module: string,
    @Res() res: Response,
  ) {
    try {
      const buffer =
        await this.templateGenerator.generateModuleTemplate(module);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${module}_template.xlsx"`,
      );
      return res.status(HttpStatus.OK).send(buffer);
    } catch {
      throw new BadRequestException(`Unknown module: ${module}`);
    }
  }

  /* ─── GET /templates — List available modules ──────────────────────── */

  @Get('templates')
  listTemplates() {
    return this.templateGenerator.getModuleList();
  }
}
