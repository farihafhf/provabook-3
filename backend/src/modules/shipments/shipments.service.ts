import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment } from '../../database/entities/shipment.entity';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { ShipmentStatus } from '../../common/enums/shipment.enum';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
  ) {}

  async create(createShipmentDto: CreateShipmentDto) {
    const shipmentNumber = await this.generateShipmentNumber();
    const shipment = this.shipmentRepository.create({ ...createShipmentDto, shipmentNumber });
    return this.shipmentRepository.save(shipment);
  }

  async findAll(orderId?: string, status?: ShipmentStatus) {
    const query = this.shipmentRepository
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.order', 'order');

    if (orderId) {
      query.where('shipment.order_id = :orderId', { orderId });
    }

    if (status) {
      query.andWhere('shipment.status = :status', { status });
    }

    query.orderBy('shipment.createdAt', 'DESC');
    return query.getMany();
  }

  async findOne(id: string) {
    const shipment = await this.shipmentRepository.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${id} not found`);
    }

    return shipment;
  }

  async update(id: string, updateShipmentDto: UpdateShipmentDto) {
    const shipment = await this.findOne(id);
    Object.assign(shipment, updateShipmentDto);
    return this.shipmentRepository.save(shipment);
  }

  async remove(id: string) {
    const shipment = await this.findOne(id);
    return this.shipmentRepository.remove(shipment);
  }

  async getInTransitShipments() {
    return this.shipmentRepository.find({
      where: { status: ShipmentStatus.IN_TRANSIT },
      relations: ['order'],
    });
  }

  private async generateShipmentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SH${year}`;

    const lastShipment = await this.shipmentRepository
      .createQueryBuilder('shipment')
      .where('shipment.shipmentNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('shipment.shipmentNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastShipment) {
      const lastSequence = parseInt(lastShipment.shipmentNumber.replace(prefix, ''));
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }
}
