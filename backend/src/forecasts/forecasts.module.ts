import { Module } from '@nestjs/common';
import { ForecastsService } from './forecasts.service';
import { ForecastEngineService } from './forecast-engine.service';
import { ForecastsController } from './forecasts.controller';
@Module({
  controllers: [ForecastsController],
  providers: [ForecastsService, ForecastEngineService],
  exports: [ForecastsService, ForecastEngineService],
})
export class ForecastsModule {}
