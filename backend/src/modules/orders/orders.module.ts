import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from '../../database/entities/order.entity';
import { UserProfile } from '../../database/entities/user-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, UserProfile])],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
