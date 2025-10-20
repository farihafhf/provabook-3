import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('production_metrics')
export class ProductionMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  orderId: string;

  @Column('date')
  productionDate: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  quantityProduced: number;

  @Column({ default: 'meters' })
  unit: string;

  @Column({ nullable: true })
  machineNumber: string;

  @Column({ nullable: true })
  shift: string;

  @Column({ nullable: true })
  operator: string;

  @Column('text', { nullable: true })
  qualityNotes: string;

  @Column({ default: false })
  hasIssues: boolean;

  @Column('text', { nullable: true })
  issues: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
