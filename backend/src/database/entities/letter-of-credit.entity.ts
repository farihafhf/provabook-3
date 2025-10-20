import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LCStatus } from '../../common/enums/financial.enum';
import { Order } from './order.entity';

@Entity('letters_of_credit')
export class LetterOfCredit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  lcNumber: string;

  @Column({
    type: 'enum',
    enum: LCStatus,
    default: LCStatus.PENDING,
  })
  status: LCStatus;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column('date')
  issueDate: Date;

  @Column('date')
  expiryDate: Date;

  @Column('date', { nullable: true })
  receiptDate: Date;

  @Column({ nullable: true })
  issuingBank: string;

  @Column({ nullable: true })
  advisingBank: string;

  @Column('text', { nullable: true })
  terms: string;

  @Column('text', { nullable: true })
  notes: string;

  @Column({ nullable: true })
  documentUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Order, (order) => order.lettersOfCredit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column('uuid')
  order_id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
