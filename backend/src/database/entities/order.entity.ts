import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { OrderStatus, OrderCategory } from '../../common/enums/order-status.enum';
import { UserProfile } from './user-profile.entity';
import { Sample } from './sample.entity';
import { ProformaInvoice } from './proforma-invoice.entity';
import { LetterOfCredit } from './letter-of-credit.entity';
import { Incident } from './incident.entity';
import { Shipment } from './shipment.entity';
import { Document } from './document.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  buyerName: string;

  @Column()
  fabricType: string;

  @Column('text', { nullable: true })
  fabricSpecifications: string;

  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number;

  @Column({ default: 'meters' })
  unit: string;

  @Column('simple-array', { nullable: true })
  colorways: string[];

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.UPCOMING,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: OrderCategory,
    default: OrderCategory.UPCOMING,
  })
  category: OrderCategory;

  @Column('date', { nullable: true })
  orderDate: Date;

  @Column('date', { nullable: true })
  expectedDeliveryDate: Date;

  @Column('date', { nullable: true })
  actualDeliveryDate: Date;

  @Column('text', { nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Approval gate statuses
  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'" })
  approvalStatus: {
    labDip?: 'pending' | 'approved' | 'rejected';
    trimsCard?: 'pending' | 'approved' | 'rejected';
    fabricTest?: 'pending' | 'approved' | 'rejected';
    fitSample?: 'pending' | 'approved' | 'rejected';
    ppSample?: 'pending' | 'approved' | 'rejected';
  };

  @Column({ default: 'Design' })
  currentStage: string; // Design, In Development, Production, Delivered

  @ManyToOne(() => UserProfile, (user) => user.orders, { nullable: true })
  @JoinColumn({ name: 'merchandiser_id' })
  merchandiser: UserProfile;

  @Column('uuid', { nullable: true })
  merchandiser_id: string;

  @OneToMany(() => Sample, (sample) => sample.order, { cascade: true })
  samples: Sample[];

  @OneToMany(() => ProformaInvoice, (pi) => pi.order, { cascade: true })
  proformaInvoices: ProformaInvoice[];

  @OneToMany(() => LetterOfCredit, (lc) => lc.order, { cascade: true })
  lettersOfCredit: LetterOfCredit[];

  @OneToMany(() => Incident, (incident) => incident.order, { cascade: true })
  incidents: Incident[];

  @OneToMany(() => Shipment, (shipment) => shipment.order, { cascade: true })
  shipments: Shipment[];

  @OneToMany(() => Document, (document) => document.order, { cascade: true })
  documents: Document[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
