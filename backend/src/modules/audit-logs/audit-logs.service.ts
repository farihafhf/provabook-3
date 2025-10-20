import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(createAuditLogDto: CreateAuditLogDto) {
    const log = this.auditLogRepository.create(createAuditLogDto);
    return this.auditLogRepository.save(log);
  }

  async findAll(filters?: {
    userId?: string;
    entityType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const query = this.auditLogRepository.createQueryBuilder('log');

    if (filters?.userId) {
      query.andWhere('log.userId = :userId', { userId: filters.userId });
    }

    if (filters?.entityType) {
      query.andWhere('log.entityType = :entityType', { entityType: filters.entityType });
    }

    if (filters?.action) {
      query.andWhere('log.action = :action', { action: filters.action });
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    query.orderBy('log.createdAt', 'DESC').limit(1000);
    return query.getMany();
  }

  async log(
    userId: string,
    userEmail: string,
    action: string,
    entityType: string,
    entityId?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>,
  ) {
    return this.create({
      userId,
      userEmail,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      metadata,
    });
  }
}
