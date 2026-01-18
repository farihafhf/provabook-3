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

  @Column()
  fileUrl: string; // Supabase public/signed URL

  @Column({ nullable: true })
  documentType: string; // Legacy field - deprecated

  @Column()
  category: string; // sample, lc, pi, test_report, email, other

  @Column({ nullable: true })
  subcategory: string; // lab_dip, strike_off, pp_sample, bulk_swatch (for samples)

  @Column('text', { nullable: true })
  description: string;

  @Column('uuid')
  uploadedBy: string;

  @Column()
  uploadedByName: string; // User's full name for display

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
