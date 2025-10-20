import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IncidentType,
  IncidentStatus,
  IncidentSeverity,
} from '../../common/enums/incident.enum';
import { Order } from './order.entity';

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: IncidentType,
  })
  type: IncidentType;

  @Column({
    type: 'enum',
    enum: IncidentStatus,
    default: IncidentStatus.OPEN,
  })
  status: IncidentStatus;

  @Column({
    type: 'enum',
    enum: IncidentSeverity,
    default: IncidentSeverity.MEDIUM,
  })
  severity: IncidentSeverity;

  @Column('date')
  incidentDate: Date;

  @Column('text', { nullable: true })
  cause: string;

  @Column('text', { nullable: true })
  actionPlan: string;

  @Column({ nullable: true })
  responsiblePerson: string;

  @Column('date', { nullable: true })
  targetResolutionDate: Date;

  @Column('date', { nullable: true })
  actualResolutionDate: Date;

  @Column('text', { nullable: true })
  resolution: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Order, (order) => order.incidents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column('uuid')
  order_id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
