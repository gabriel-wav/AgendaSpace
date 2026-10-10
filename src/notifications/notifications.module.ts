import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushService } from './push.service';
import { PushWorker } from './push.worker';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService, PushWorker],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
