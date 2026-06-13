import { Module } from '@nestjs/common';
import { ActualImportsService } from './actual-imports.service';
import { ActualImportsController } from './actual-imports.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ActualImportsController],
  providers: [ActualImportsService],
  exports: [ActualImportsService],
})
export class ActualImportsModule {}
