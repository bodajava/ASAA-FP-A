import { Module } from '@nestjs/common';
import { RawMaterialPricesService } from './raw-material-prices.service';
import { RawMaterialPricesController } from './raw-material-prices.controller';
@Module({
  controllers: [RawMaterialPricesController],
  providers: [RawMaterialPricesService],
  exports: [RawMaterialPricesService],
})
export class RawMaterialPricesModule {}
