import { Module } from '@nestjs/common';
import { KpiTargetsService } from './kpi-targets.service';
import { KpiTargetsController } from './kpi-targets.controller';
@Module({
  controllers: [KpiTargetsController],
  providers: [KpiTargetsService],
  exports: [KpiTargetsService],
})
export class KpiTargetsModule {}
