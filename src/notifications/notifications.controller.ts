import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubscribePushDto, UnsubscribePushDto } from './dto/push-subscription.dto';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationsService.findAll(
      userId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser('id') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.markAsRead(userId, notificationId);
    return { success: true };
  }

  @Get('push/public-key')
  getPublicKey() {
    return this.pushService.getPublicKey();
  }

  @Get('push/subscriptions')
  async getSubscriptions(@CurrentUser('id') userId: string) {
    return this.pushService.getSubscriptions(userId);
  }

  @Post('push/subscribe')
  async subscribe(
    @CurrentUser('id') userId: string,
    @Body() dto: SubscribePushDto,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'] as string;
    return this.pushService.subscribe(userId, dto, userAgent);
  }

  @Post('push/unsubscribe')
  async unsubscribe(
    @CurrentUser('id') userId: string,
    @Body() dto: UnsubscribePushDto,
  ) {
    return this.pushService.unsubscribe(userId, dto.endpoint);
  }

  @Post('push/test')
  async sendTestPush(@CurrentUser('id') userId: string) {
    return this.pushService.sendTestPush(userId);
  }
}
