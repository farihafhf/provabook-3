import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async logActivity(data: {
    userId: string;
    userEmail: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    metadata?: Record<string, any>;
  }) {
    const log = this.auditLogRepository.create(data);
    return this.auditLogRepository.save(log);
  }

  async getRecentActivities(limit: number = 10, merchandiserId?: string) {
    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .limit(limit);

    if (merchandiserId) {
      // Filter activities for specific merchandiser's orders
      query.andWhere('log.metadata->>\'merchandiser_id\' = :merchandiserId', {
        merchandiserId,
      });
    }

    return query.getMany();
  }

  async getActivitiesForOrder(orderId: string, limit: number = 20) {
    return this.auditLogRepository.find({
      where: { entityId: orderId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
