import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { OrderCategory } from '../../common/enums/order-status.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async getDashboardData(user: any) {
    if (user.role === UserRole.MANAGER || user.role === UserRole.ADMIN) {
      return this.getManagerDashboard();
    } else if (user.role === UserRole.MERCHANDISER) {
      return this.getMerchandiserDashboard(user.id);
    }

    // Default fallback
    return this.getMerchandiserDashboard(user.id);
  }

  private async getManagerDashboard() {
    // Get order counts
    const totalCount = await this.orderRepository.count();

    const upcomingCount = await this.orderRepository.count({
      where: { category: OrderCategory.UPCOMING },
    });

    const runningCount = await this.orderRepository.count({
      where: { category: OrderCategory.RUNNING },
    });

    const archivedCount = await this.orderRepository.count({
      where: { category: OrderCategory.ARCHIVED },
    });

    // Get recent company-wide activities (last 10)
    const recentActivities = await this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.entityType = :entityType', { entityType: 'Order' })
      .orderBy('log.createdAt', 'DESC')
      .limit(10)
      .getMany();

    // Format activities with user names and order numbers
    const formattedActivities = recentActivities.map((log) => ({
      id: log.id,
      action: this.formatAction(log.action, log.metadata),
      userName: log.metadata?.userName || log.userEmail,
      orderNumber: log.metadata?.orderNumber || 'N/A',
      customerName: log.metadata?.customerName,
      buyerName: log.metadata?.buyerName,
      timestamp: log.createdAt,
      details: this.getActionDetails(log),
    }));

    return {
      totalCount,
      upcomingCount,
      runningCount,
      archivedCount,
      recentActivities: formattedActivities,
    };
  }

  private async getMerchandiserDashboard(merchandiserId: string) {
    // Get recent activities only for this merchandiser's orders
    const recentActivities = await this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.entityType = :entityType', { entityType: 'Order' })
      .andWhere('log.metadata->>\'merchandiser_id\' = :merchandiserId', {
        merchandiserId,
      })
      .orderBy('log.createdAt', 'DESC')
      .limit(10)
      .getMany();

    // Format activities
    const formattedActivities = recentActivities.map((log) => ({
      id: log.id,
      action: this.formatAction(log.action, log.metadata),
      userName: log.metadata?.userName || log.userEmail,
      orderNumber: log.metadata?.orderNumber || 'N/A',
      customerName: log.metadata?.customerName,
      buyerName: log.metadata?.buyerName,
      timestamp: log.createdAt,
      details: this.getActionDetails(log),
    }));

    // Get merchandiser's order counts
    const myTotalCount = await this.orderRepository.count({
      where: { merchandiser_id: merchandiserId },
    });

    const myUpcomingCount = await this.orderRepository.count({
      where: {
        category: OrderCategory.UPCOMING,
        merchandiser_id: merchandiserId,
      },
    });

    const myRunningCount = await this.orderRepository.count({
      where: {
        category: OrderCategory.RUNNING,
        merchandiser_id: merchandiserId,
      },
    });

    const myArchivedCount = await this.orderRepository.count({
      where: {
        category: OrderCategory.ARCHIVED,
        merchandiser_id: merchandiserId,
      },
    });

    return {
      recentActivities: formattedActivities,
      myTotalCount,
      myUpcomingCount,
      myRunningCount,
      myArchivedCount,
    };
  }

  private formatAction(action: string, metadata: any): string {
    switch (action) {
      case 'UPDATE_APPROVAL':
        return `Updated ${this.formatApprovalType(metadata?.approvalType)} to ${metadata?.newStatus}`;
      case 'CHANGE_STAGE':
        return `Changed stage from ${metadata?.oldStage} to ${metadata?.newStage}`;
      case 'CREATE':
        return 'Created order';
      case 'UPDATE':
        return 'Updated order';
      default:
        return action;
    }
  }

  private formatApprovalType(type: string): string {
    const types: Record<string, string> = {
      labDip: 'Lab Dip',
      strikeOff: 'Strike-Off',
      qualityTest: 'Quality Test',
      bulkSwatch: 'Bulk Swatch',
      ppSample: 'PP Sample',
    };
    return types[type] || type;
  }

  private getActionDetails(log: AuditLog): any {
    return {
      approvalType: log.metadata?.approvalType,
      newStatus: log.metadata?.newStatus,
      oldStage: log.metadata?.oldStage,
      newStage: log.metadata?.newStage,
    };
  }
}
