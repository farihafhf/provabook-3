import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ProductionMetric } from '../../database/entities/production-metric.entity';
import { CreateProductionMetricDto } from './dto/create-production-metric.dto';
import { UpdateProductionMetricDto } from './dto/update-production-metric.dto';

@Injectable()
export class ProductionService {
  constructor(
    @InjectRepository(ProductionMetric)
    private readonly productionMetricRepository: Repository<ProductionMetric>,
  ) {}

  async create(createProductionMetricDto: CreateProductionMetricDto) {
    const metric = this.productionMetricRepository.create(createProductionMetricDto);
    return this.productionMetricRepository.save(metric);
  }

  async findAll(orderId?: string, startDate?: Date, endDate?: Date) {
    const query = this.productionMetricRepository.createQueryBuilder('metric');

    if (orderId) {
      query.where('metric.orderId = :orderId', { orderId });
    }

    if (startDate && endDate) {
      query.andWhere('metric.productionDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    query.orderBy('metric.productionDate', 'DESC');
    return query.getMany();
  }

  async findOne(id: string) {
    const metric = await this.productionMetricRepository.findOne({ where: { id } });

    if (!metric) {
      throw new NotFoundException(`Production metric with ID ${id} not found`);
    }

    return metric;
  }

  async update(id: string, updateProductionMetricDto: UpdateProductionMetricDto) {
    const metric = await this.findOne(id);
    Object.assign(metric, updateProductionMetricDto);
    return this.productionMetricRepository.save(metric);
  }

  async remove(id: string) {
    const metric = await this.findOne(id);
    return this.productionMetricRepository.remove(metric);
  }

  async getOrderProductionStats(orderId: string) {
    const metrics = await this.productionMetricRepository.find({
      where: { orderId },
    });

    const totalProduced = metrics.reduce((sum, m) => sum + parseFloat(m.quantityProduced.toString()), 0);
    const metricsWithIssues = metrics.filter((m) => m.hasIssues).length;

    return {
      totalProduced,
      totalEntries: metrics.length,
      metricsWithIssues,
      averageDaily: metrics.length > 0 ? totalProduced / metrics.length : 0,
    };
  }
}
