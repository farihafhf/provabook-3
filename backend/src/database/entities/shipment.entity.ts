import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ShipmentStatus, ShipmentMode } from '../../common/enums/shipment.enum';
import { Order } from './order.entity';

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  shipmentNumber: string;

  @Column({
    type: 'enum',
    enum: ShipmentStatus,
    default: ShipmentStatus.PENDING,
  })
  status: ShipmentStatus;

  @Column({
    type: 'enum',
    enum: ShipmentMode,
    default: ShipmentMode.SEA,
  })
  mode: ShipmentMode;

  @Column({ nullable: true })
  awbNumber: string;

  @Column({ nullable: true })
  courierName: string;

  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number;

  @Column({ default: 'meters' })
  unit: string;

  @Column('date', { nullable: true })
  estimatedDepartureDate: Date;

  @Column('date', { nullable: true })
  actualDepartureDate: Date;

  @Column('date', { nullable: true })
  estimatedArrivalDate: Date;

  @Column('date', { nullable: true })
  actualArrivalDate: Date;

  @Column({ nullable: true })
  packingListUrl: string;

  @Column({ nullable: true })
  invoiceUrl: string;

  @Column('text', { nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Order, (order) => order.shipments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column('uuid')
  order_id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
