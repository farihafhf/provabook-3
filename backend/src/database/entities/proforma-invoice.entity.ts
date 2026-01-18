import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PIStatus } from '../../common/enums/financial.enum';
import { Order } from './order.entity';
import { UserProfile } from './user-profile.entity';

@Entity('proforma_invoices')
export class ProformaInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  piNumber: string;

  @Column({ default: 1 })
  version: number;

  @Column({
    type: 'enum',
    enum: PIStatus,
    default: PIStatus.DRAFT,
  })
  status: PIStatus;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column('date', { nullable: true })
  issueDate: Date;

  @Column('date', { nullable: true })
  sentDate: Date;

  @Column('date', { nullable: true })
  confirmedDate: Date;

  @Column('text', { nullable: true })
  terms: string;

  @Column('text', { nullable: true })
  notes: string;

  @Column({ nullable: true })
  documentUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Order, (order) => order.proformaInvoices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column('uuid')
  order_id: string;

  @ManyToOne(() => UserProfile, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: UserProfile;

  @Column('uuid', { nullable: true })
  created_by_id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
