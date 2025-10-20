import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../database/entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationType, NotificationPriority } from '../../common/enums/notification.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const notification = this.notificationRepository.create(createNotificationDto);
    return this.notificationRepository.save(notification);
  }

  async findAllForUser(userId: string, isRead?: boolean) {
    const query = this.notificationRepository.createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId });

    if (isRead !== undefined) {
      query.andWhere('notification.isRead = :isRead', { isRead });
    }

    query.orderBy('notification.createdAt', 'DESC');
    return query.getMany();
  }

  async findOne(id: string) {
    const notification = await this.notificationRepository.findOne({ where: { id } });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async markAsRead(id: string) {
    const notification = await this.findOne(id);
    notification.isRead = true;
    notification.readAt = new Date();
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { user_id: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { success: true };
  }

  async remove(id: string) {
    const notification = await this.findOne(id);
    return this.notificationRepository.remove(notification);
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.count({
      where: { user_id: userId, isRead: false },
    });
    return { count };
  }

  // Helper method to create notifications for specific events
  async notifyUser(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    relatedEntityType?: string,
    relatedEntityId?: string,
  ) {
    return this.create({
      user_id: userId,
      type,
      title,
      message,
      priority,
      relatedEntityType,
      relatedEntityId,
    });
  }
}
