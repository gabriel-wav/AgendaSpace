import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private getSaoPauloBounds() {
    const now = new Date();
    // Convert to SP time components
    const spStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const spDate = new Date(spStr);
    
    // Today bounds in UTC based on SP day
    const startOfToday = new Date(Date.UTC(spDate.getFullYear(), spDate.getMonth(), spDate.getDate(), 3, 0, 0)); // UTC is SP+3
    const endOfToday = new Date(Date.UTC(spDate.getFullYear(), spDate.getMonth(), spDate.getDate() + 1, 2, 59, 59, 999));
    
    // Month bounds in UTC based on SP month
    const startOfMonth = new Date(Date.UTC(spDate.getFullYear(), spDate.getMonth(), 1, 3, 0, 0));
    const endOfMonth = new Date(Date.UTC(spDate.getFullYear(), spDate.getMonth() + 1, 0, 2, 59, 59, 999));
    
    return { startOfToday, endOfToday, startOfMonth, endOfMonth };
  }

  async getAdminStats() {
    const { startOfToday, endOfToday, startOfMonth, endOfMonth } = this.getSaoPauloBounds();

    const totalSpaces = await this.prisma.space.count({ where: { isActive: true } });
    
    const todayBookings = await this.prisma.booking.count({
      where: {
        startDatetime: { gte: startOfToday, lte: endOfToday },
        status: { not: 'CANCELLED' }
      }
    });

    const activeUsers = await this.prisma.user.count(); // Usuarios cadastrados

    // Receita de pagamentos (não cancelados) criados este mês
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        booking: { status: { in: ['CONFIRMED', 'COMPLETED'] } }
      }
    });
    
    const monthlyRevenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);

    const recentBookings = await this.prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        space: {
          select: {
            id: true,
            name: true,
            capacity: true,
            resources: true,
            imageUrl: true,
            images: {
              orderBy: { position: 'asc' },
              select: { url: true, position: true }
            }
          }
        },
        user: { select: { fullName: true } }
      }
    });

    return {
      totalSpaces,
      todayBookings,
      monthlyRevenue: monthlyRevenue.toFixed(2),
      activeUsers,
      recentBookings
    };
  }

  async getHostStats(hostId: string) {
    const { startOfToday, endOfToday, startOfMonth, endOfMonth } = this.getSaoPauloBounds();

    const spaces = await this.prisma.space.findMany({
      where: { createdById: hostId, isActive: true },
      select: { id: true }
    });
    
    const spaceIds = spaces.map(s => s.id);

    const todayBookingsCount = await this.prisma.booking.count({
      where: {
        spaceId: { in: spaceIds },
        startDatetime: { gte: startOfToday, lte: endOfToday },
        status: { not: 'CANCELLED' }
      }
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        booking: {
          spaceId: { in: spaceIds },
          status: { in: ['CONFIRMED', 'COMPLETED'] }
        }
      }
    });

    const monthlyRevenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);

    return {
      totalSpaces: spaceIds.length,
      todayBookings: todayBookingsCount,
      monthlyRevenue: monthlyRevenue.toFixed(2)
    };
  }

  async getClientStats(userId: string) {
    const now = new Date();
    
    const recentBookings = await this.prisma.booking.findMany({
      where: {
        userId,
        startDatetime: { gte: now },
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        space: {
          select: {
            id: true,
            name: true,
            capacity: true,
            resources: true,
            imageUrl: true,
            images: {
              orderBy: { position: 'asc' },
              select: { url: true, position: true }
            }
          }
        },
        payment: { select: { id: true, status: true } }
      },
      orderBy: { startDatetime: 'asc' },
      take: 5
    });

    const confirmedCount = await this.prisma.booking.count({
      where: {
        userId,
        startDatetime: { gte: now },
        status: 'CONFIRMED'
      }
    });

    const totalUpcomingHours = recentBookings.reduce((acc, b) => {
      const hours = (b.endDatetime.getTime() - b.startDatetime.getTime()) / (1000 * 60 * 60);
      return acc + (isNaN(hours) ? 0 : hours);
    }, 0);

    const activeSpaces = await this.prisma.space.count({ where: { isActive: true, deletedAt: null } });

    return {
      upcomingBookings: confirmedCount,
      totalHours: totalUpcomingHours,
      availableSpaces: activeSpaces,
      recentBookings
    };
  }
}
