import { Global, Module } from '@nestjs/common';
import { AuditService } from './services/audit.service';
import { TenantService } from './services/tenant.service';

@Global()
@Module({
  providers: [AuditService, TenantService],
  exports: [AuditService, TenantService],
})
export class CommonModule {}
