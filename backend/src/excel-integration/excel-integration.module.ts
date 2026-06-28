/**
 * Excel Integration Module
 *
 * Wires together all Excel-first integration services:
 * - ExcelAnalyzerService — workbook structure analysis
 * - ColumnMatcherService — Excel column → ERP field mapping
 * - ValidationEngineService — row-level validation
 * - ErpModuleMapperService — sheet → ERP module mapping
 * - StreamingImportService — chunk-based batch inserts
 * - ExcelIntegrationService — orchestrator
 */

import { Module } from '@nestjs/common';
import { ExcelAnalyzerService } from './excel-analyzer.service';
import { ColumnMatcherService } from './column-matcher.service';
import { ValidationEngineService } from './validation-engine.service';
import { ErpModuleMapperService } from './erp-module-mapper.service';
import { StreamingImportService } from './streaming-import.service';
import { ExcelIntegrationService } from './excel-integration.service';
import { TemplateGeneratorService } from './template-generator.service';
import { ImportDependencyCheckerService } from './import-dependency-checker.service';
import { ExcelIntegrationController } from './excel-integration.controller';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExcelIntegrationController],
  providers: [
    ExcelAnalyzerService,
    ColumnMatcherService,
    ValidationEngineService,
    ErpModuleMapperService,
    StreamingImportService,
    ExcelIntegrationService,
    TemplateGeneratorService,
    ImportDependencyCheckerService,
  ],
  exports: [
    ExcelAnalyzerService,
    ColumnMatcherService,
    ValidationEngineService,
    ErpModuleMapperService,
    StreamingImportService,
    ExcelIntegrationService,
    TemplateGeneratorService,
    ImportDependencyCheckerService,
  ],
})
export class ExcelIntegrationModule {}
