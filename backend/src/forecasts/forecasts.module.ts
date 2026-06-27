import { Module } from '@nestjs/common';
import { ForecastsService } from './forecasts.service';
import { ForecastEngineService } from './forecast-engine.service';
import { ForecastsController } from './forecasts.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { CostingModule } from '../costing/costing.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [NotificationsModule, CostingModule, ExchangeRatesModule],
  controllers: [ForecastsController],
  providers: [ForecastsService, ForecastEngineService],
  exports: [ForecastsService, ForecastEngineService],
})
export class ForecastsModule {}
