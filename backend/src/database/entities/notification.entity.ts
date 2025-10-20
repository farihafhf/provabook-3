import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationType, NotificationPriority } from '../../common/enums/notification.enum';
import { UserProfile } from './user-profile.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @Column('timestamp', { nullable: true })
  readAt: Date;

  @Column({ nullable: true })
  relatedEntityType: string; // Order, Sample, PI, LC, Incident, Shipment

  @Column('uuid', { nullable: true })
  relatedEntityId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => UserProfile, (user) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserProfile;

  @Column('uuid')
  user_id: string;

  @CreateDateColumn()
  createdAt: Date;
}
