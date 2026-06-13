import { Module } from '@nestjs/common';
import { HeadcountPlansService } from './headcount-plans.service';
import { HeadcountPlansController } from './headcount-plans.controller';
@Module({
  controllers: [HeadcountPlansController],
  providers: [HeadcountPlansService],
  exports: [HeadcountPlansService],
})
export class HeadcountPlansModule {}
