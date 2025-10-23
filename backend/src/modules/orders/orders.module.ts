import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from '../../database/entities/order.entity';
import { Document } from '../../database/entities/document.entity';
import { UserProfile } from '../../database/entities/user-profile.entity';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Document, UserProfile]),
    ActivityLogModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, SupabaseStorageService],
  exports: [OrdersService],
})
export class OrdersModule {}
