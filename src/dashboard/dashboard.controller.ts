import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getAdminStats(): Promise<any> {
    return this.dashboardService.getAdminStats();
  }

  @Get('host')
  async getHostStats(@CurrentUser() user: { id: string }): Promise<any> {
    return this.dashboardService.getHostStats(user.id);
  }

  @Get('client')
  async getClientStats(@CurrentUser() user: { id: string }): Promise<any> {
    return this.dashboardService.getClientStats(user.id);
  }
}
