import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from '../../database/entities/incident.entity';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { IncidentStatus, IncidentSeverity } from '../../common/enums/incident.enum';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
  ) {}

  async create(createIncidentDto: CreateIncidentDto) {
    const incident = this.incidentRepository.create(createIncidentDto);
    return this.incidentRepository.save(incident);
  }

  async findAll(orderId?: string, status?: IncidentStatus) {
    const query = this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.order', 'order');

    if (orderId) {
      query.where('incident.order_id = :orderId', { orderId });
    }

    if (status) {
      query.andWhere('incident.status = :status', { status });
    }

    query.orderBy('incident.createdAt', 'DESC');
    return query.getMany();
  }

  async findOne(id: string) {
    const incident = await this.incidentRepository.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!incident) {
      throw new NotFoundException(`Incident with ID ${id} not found`);
    }

    return incident;
  }

  async update(id: string, updateIncidentDto: UpdateIncidentDto) {
    const incident = await this.findOne(id);
    Object.assign(incident, updateIncidentDto);
    return this.incidentRepository.save(incident);
  }

  async remove(id: string) {
    const incident = await this.findOne(id);
    return this.incidentRepository.remove(incident);
  }

  async getOpenIncidents() {
    return this.incidentRepository.find({
      where: { status: IncidentStatus.OPEN },
      relations: ['order'],
    });
  }

  async getCriticalIncidents() {
    return this.incidentRepository.find({
      where: { severity: IncidentSeverity.CRITICAL },
      relations: ['order'],
    });
  }
}
