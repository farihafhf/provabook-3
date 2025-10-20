import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, OrderCategory } from '../../common/enums/order-status.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    // Generate unique order number
    const orderNumber = await this.generateOrderNumber();

    const order = this.orderRepository.create({
      ...createOrderDto,
      orderNumber,
      merchandiser_id: userId,
    });

    return this.orderRepository.save(order);
  }

  async findAll(filters?: {
    status?: OrderStatus;
    category?: OrderCategory;
    merchandiserId?: string;
  }) {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.merchandiser', 'merchandiser')
      .leftJoinAndSelect('order.samples', 'samples')
      .leftJoinAndSelect('order.proformaInvoices', 'proformaInvoices')
      .leftJoinAndSelect('order.lettersOfCredit', 'lettersOfCredit')
      .leftJoinAndSelect('order.incidents', 'incidents')
      .leftJoinAndSelect('order.shipments', 'shipments');

    if (filters?.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters?.category) {
      query.andWhere('order.category = :category', { category: filters.category });
    }

    if (filters?.merchandiserId) {
      query.andWhere('order.merchandiser_id = :merchandiserId', {
        merchandiserId: filters.merchandiserId,
      });
    }

    query.orderBy('order.createdAt', 'DESC');

    return query.getMany();
  }

  async findOne(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'merchandiser',
        'samples',
        'proformaInvoices',
        'lettersOfCredit',
        'incidents',
        'shipments',
        'documents',
      ],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.findOne(id);
    Object.assign(order, updateOrderDto);
    return this.orderRepository.save(order);
  }

  async remove(id: string) {
    const order = await this.findOne(id);
    return this.orderRepository.remove(order);
  }

  async getOrderStats(merchandiserId?: string) {
    const query = this.orderRepository.createQueryBuilder('order');

    if (merchandiserId) {
      query.where('order.merchandiser_id = :merchandiserId', { merchandiserId });
    }

    const totalOrders = await query.getCount();

    const upcomingOrders = await query
      .clone()
      .andWhere('order.category = :category', { category: OrderCategory.UPCOMING })
      .getCount();

    const runningOrders = await query
      .clone()
      .andWhere('order.category = :category', { category: OrderCategory.RUNNING })
      .getCount();

    const archivedOrders = await query
      .clone()
      .andWhere('order.category = :category', { category: OrderCategory.ARCHIVED })
      .getCount();

    return {
      totalOrders,
      upcomingOrders,
      runningOrders,
      archivedOrders,
    };
  }

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PB${year}`;

    const lastOrder = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.orderNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('order.orderNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.replace(prefix, ''));
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }
}
