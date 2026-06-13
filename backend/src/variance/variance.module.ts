import { Module } from '@nestjs/common';
import { VarianceService } from './variance.service';
import { VarianceController } from './variance.controller';
@Module({
  controllers: [VarianceController],
  providers: [VarianceService],
  exports: [VarianceService],
})
export class VarianceModule {}
