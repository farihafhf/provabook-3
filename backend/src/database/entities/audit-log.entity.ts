import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  userEmail: string;

  @Column()
  action: string; // CREATE, UPDATE, DELETE, LOGIN, LOGOUT

  @Column()
  entityType: string; // Order, Sample, PI, LC, etc.

  @Column('uuid', { nullable: true })
  entityId: string;

  @Column('jsonb', { nullable: true })
  oldValues: Record<string, any>;

  @Column('jsonb', { nullable: true })
  newValues: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
