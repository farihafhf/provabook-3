import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SamplesController } from './samples.controller';
import { SamplesService } from './samples.service';
import { Sample } from '../../database/entities/sample.entity';
import { Order } from '../../database/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sample, Order])],
  controllers: [SamplesController],
  providers: [SamplesService],
  exports: [SamplesService],
})
export class SamplesModule {}
