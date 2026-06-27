import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { AlertsService } from './alerts.service';
import { CostingModule } from '../costing/costing.module';

@Module({
  imports: [CostingModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, AlertsService],
  exports: [NotificationsService, AlertsService],
})
export class NotificationsModule {}
