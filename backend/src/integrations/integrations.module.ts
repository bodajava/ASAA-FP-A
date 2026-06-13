import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { ActualImportsModule } from '../actual-imports/actual-imports.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ActualImportsModule, NotificationsModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
