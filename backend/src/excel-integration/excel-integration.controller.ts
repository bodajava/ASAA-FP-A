/**
 * Excel Integration Controller
 *
 * REST API endpoints for the Excel-first import system.
 * All routes require authentication and x-company-id header.
 */

import {
  Controller, Post, Get, Body, Param, UploadedFile, UseInterceptors,
  HttpCode, HttpStatus, BadRequestException, Headers, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ExcelIntegrationService } from './excel-integration.service';
import { TemplateGeneratorService } from './template-generator.service';
import {
  WorkbookAnalysis, ErpModuleMapping, SheetValidationResult,
  ImportExecutionResult, ImportPlan,
} from './types/excel-integration.types';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Controller('api/v1/excel-integration')
export class ExcelIntegrationController {
  constructor(
    private readonly service: ExcelIntegrationService,
    private readonly templateGenerator: TemplateGeneratorService,
  ) {}

  /* ─── POST /analyze — Analyze workbook structure ────────────────────── */

  @Post('analyze')
  @UseInterceptors(FileInterceptor('file'))
  async analyze(
    @UploadedFile() file: MulterFile,
  ): Promise<WorkbookAnalysis> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.mimetype) && !file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      throw new BadRequestException('File must be an Excel (.xlsx, .xls) or CSV file');
    }

    return this.service.analyzeWorkbook(file.buffer, file.originalname);
  }

  /* ─── POST /map — Analyze + map to ERP modules ─────────────────────── */

  @Post('map')
  @UseInterceptors(FileInterceptor('file'))
  async mapToModules(
    @UploadedFile() file: MulterFile,
  ): Promise<{
    analysis: WorkbookAnalysis;
    mappings: ErpModuleMapping[];
    warnings: any[];
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const analysis = this.service.analyzeWorkbook(file.buffer, file.originalname);
    const { mappings, warnings } = this.service.mapToModules(analysis);
    analysis.warnings.push(...warnings);

    return { analysis, mappings, warnings };
  }

  /* ─── POST /validate — Analyze + validate data ─────────────────────── */

  @Post('validate')
  @UseInterceptors(FileInterceptor('file'))
  async validate(
    @UploadedFile() file: MulterFile,
  ): Promise<{
    analysis: WorkbookAnalysis;
    validations: SheetValidationResult[];
    summary: any;
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const analysis = this.service.analyzeWorkbook(file.buffer, file.originalname);
    const validations = this.service.validateWorkbook(file.buffer, analysis);

    const summary = {
      isValid: validations.every(v => v.errors.length === 0),
      totalRows: validations.reduce((sum, v) => sum + v.totalRows, 0),
      validRows: validations.reduce((sum, v) => sum + v.validRows, 0),
      totalErrors: validations.reduce((sum, v) => sum + v.errors.length, 0),
      totalWarnings: validations.reduce((sum, v) => sum + v.warnings.length, 0),
      totalDuplicates: validations.reduce((sum, v) => sum + v.duplicateRows, 0),
      sheets: validations.map(v => ({
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
  @UseInterceptors(FileInterceptor('file'))
  async plan(
    @UploadedFile() file: MulterFile,
  ): Promise<{
    analysis: WorkbookAnalysis;
    mappings: ErpModuleMapping[];
    validations: SheetValidationResult[];
    importPlan: ImportPlan;
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const analysis = this.service.analyzeWorkbook(file.buffer, file.originalname);
    const { mappings } = this.service.mapToModules(analysis);
    const validations = this.service.validateWorkbook(file.buffer, analysis);
    const importPlan = this.service.buildImportPlan(analysis, mappings, validations);

    return { analysis, mappings, validations, importPlan };
  }

  /* ─── POST /import — Full pipeline: analyze + map + validate + import ── */

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async import(
    @UploadedFile() file: MulterFile,
    @Headers('x-company-id') companyIdHeader: string,
    @Body() body: { dryRun?: string; skipErrors?: string; columnOverrides?: string },
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

    const result = await this.service.fullImport(
      file.buffer,
      file.originalname,
      companyId,
      { dryRun, skipErrors, userColumnOverrides },
    );

    return {
      analysis: result.analysis,
      mappings: result.mappings,
      validations: result.validations,
      importPlan: result.importPlan,
      importResult: result.importResult,
    };
  }

  /* ─── GET /modules — List available ERP modules ─────────────────────── */

  @Get('modules')
  getModules(): Array<{ key: string; description: string; targetTable: string }> {
    return this.service.getAvailableModules();
  }

  /* ─── GET /dependencies — Get module dependency graph ───────────────── */

  @Get('dependencies')
  getDependencies(): Record<string, string[]> {
    return this.service.getDependencyGraph();
  }

  /* ─── GET /templates/client-workbook — Download full workbook template ── */

  @Get('templates/client-workbook')
  downloadClientWorkbook(@Res() res: Response) {
    const buffer = this.templateGenerator.generateFullWorkbook();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Harvest_Workbook_Template.xlsx"');
    return res.status(HttpStatus.OK).send(buffer);
  }

  /* ─── GET /templates/:module — Download module-specific template ──── */

  @Get('templates/:module')
  downloadModuleTemplate(@Param('module') module: string, @Res() res: Response) {
    try {
      const buffer = this.templateGenerator.generateModuleTemplate(module);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${module}_template.xlsx"`);
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
