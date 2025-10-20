import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string;

  @Column()
  fileType: string;

  @Column()
  fileSize: number;

  @Column()
  storagePath: string;

  @Column({ nullable: true })
  documentType: string; // PO, CAD, Tech Pack, Invoice, etc.

  @Column('text', { nullable: true })
  description: string;

  @Column('uuid')
  uploadedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Order, (order) => order.documents, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column('uuid', { nullable: true })
  order_id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
