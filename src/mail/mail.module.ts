import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailWorker } from './mail.worker';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MailService, MailWorker],
  exports: [MailService],
})
export class MailModule {}
