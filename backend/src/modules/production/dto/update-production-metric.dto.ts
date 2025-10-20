import { PartialType } from '@nestjs/swagger';
import { CreateProductionMetricDto } from './create-production-metric.dto';

export class UpdateProductionMetricDto extends PartialType(CreateProductionMetricDto) {}
