import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';
import { ProductionMetric } from '../../database/entities/production-metric.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionMetric])],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
