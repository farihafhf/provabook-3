import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SampleType, SampleStatus } from '../../common/enums/sample.enum';
import { Order } from './order.entity';

@Entity('samples')
export class Sample {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SampleType,
  })
  type: SampleType;

  @Column({ default: 1 })
  version: number;

  @Column({
    type: 'enum',
    enum: SampleStatus,
    default: SampleStatus.PENDING,
  })
  status: SampleStatus;

  @Column('date', { nullable: true })
  submissionDate: Date;

  @Column('date', { nullable: true })
  receiptDate: Date;

  @Column({ nullable: true })
  recipient: string;

  @Column({ nullable: true })
  courierName: string;

  @Column({ nullable: true })
  awbNumber: string;

  @Column('text', { nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  responsiblePerson: string;

  @Column('date', { nullable: true })
  resubmissionTargetDate: Date;

  @Column({ default: false })
  resubmissionPlanSet: boolean;

  @Column('text', { nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Order, (order) => order.samples, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column('uuid')
  order_id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
