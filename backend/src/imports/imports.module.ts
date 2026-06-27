import { Module } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { EnterpriseImportService } from './enterprise-import.service';
import { ExcelIntegrationModule } from '../excel-integration/excel-integration.module';

@Module({
  imports: [ExcelIntegrationModule],
  controllers: [ImportsController],
  providers: [ImportsService, EnterpriseImportService],
  exports: [ImportsService, EnterpriseImportService],
})
export class ImportsModule {}
