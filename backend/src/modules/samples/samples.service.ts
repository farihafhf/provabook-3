import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sample } from '../../database/entities/sample.entity';
import { CreateSampleDto } from './dto/create-sample.dto';
import { UpdateSampleDto } from './dto/update-sample.dto';
import { SampleStatus } from '../../common/enums/sample.enum';

@Injectable()
export class SamplesService {
  constructor(
    @InjectRepository(Sample)
    private readonly sampleRepository: Repository<Sample>,
  ) {}

  async create(createSampleDto: CreateSampleDto) {
    const sample = this.sampleRepository.create(createSampleDto);
    return this.sampleRepository.save(sample);
  }

  async findAll(orderId?: string) {
    const query = this.sampleRepository.createQueryBuilder('sample');

    if (orderId) {
      query.where('sample.order_id = :orderId', { orderId });
    }

    query.orderBy('sample.createdAt', 'DESC');
    return query.getMany();
  }

  async findOne(id: string) {
    const sample = await this.sampleRepository.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!sample) {
      throw new NotFoundException(`Sample with ID ${id} not found`);
    }

    return sample;
  }

  async update(id: string, updateSampleDto: UpdateSampleDto) {
    const sample = await this.findOne(id);
    
    // Auto-set resubmissionPlanSet flag
    if (
      sample.status === SampleStatus.REJECTED &&
      updateSampleDto.responsiblePerson &&
      updateSampleDto.resubmissionTargetDate
    ) {
      updateSampleDto.resubmissionPlanSet = true;
    }

    Object.assign(sample, updateSampleDto);
    return this.sampleRepository.save(sample);
  }

  async remove(id: string) {
    const sample = await this.findOne(id);
    return this.sampleRepository.remove(sample);
  }

  async getPendingResubmissions() {
    return this.sampleRepository.find({
      where: {
        status: SampleStatus.REJECTED,
        resubmissionPlanSet: false,
      },
      relations: ['order'],
    });
  }
}
