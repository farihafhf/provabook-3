import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ProformaInvoice } from '../../database/entities/proforma-invoice.entity';
import { LetterOfCredit } from '../../database/entities/letter-of-credit.entity';
import { CreateProformaInvoiceDto } from './dto/create-proforma-invoice.dto';
import { UpdateProformaInvoiceDto } from './dto/update-proforma-invoice.dto';
import { CreateLetterOfCreditDto } from './dto/create-letter-of-credit.dto';
import { UpdateLetterOfCreditDto } from './dto/update-letter-of-credit.dto';
import { LCStatus } from '../../common/enums/financial.enum';
import { addDays } from 'date-fns';

@Injectable()
export class FinancialsService {
  constructor(
    @InjectRepository(ProformaInvoice)
    private readonly piRepository: Repository<ProformaInvoice>,
    @InjectRepository(LetterOfCredit)
    private readonly lcRepository: Repository<LetterOfCredit>,
  ) {}

  // Proforma Invoice methods
  async createPI(createPiDto: CreateProformaInvoiceDto, userId: string) {
    const piNumber = await this.generatePINumber();
    const pi = this.piRepository.create({ 
      ...createPiDto, 
      piNumber,
      created_by_id: userId,
    });
    return this.piRepository.save(pi);
  }

  async findAllPIs(orderId?: string, userId?: string, userRole?: string) {
    const query = this.piRepository
      .createQueryBuilder('pi')
      .leftJoinAndSelect('pi.order', 'order')
      .leftJoinAndSelect('pi.createdBy', 'createdBy');

    // Merchandisers only see their own PIs
    if (userRole === 'merchandiser' && userId) {
      query.andWhere('pi.created_by_id = :userId', { userId });
    }

    if (orderId) {
      query.andWhere('pi.order_id = :orderId', { orderId });
    }

    query.orderBy('pi.createdAt', 'DESC');
    return query.getMany();
  }

  async findOnePI(id: string) {
    const pi = await this.piRepository.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!pi) {
      throw new NotFoundException(`Proforma Invoice with ID ${id} not found`);
    }

    return pi;
  }

  async updatePI(id: string, updatePiDto: UpdateProformaInvoiceDto) {
    const pi = await this.findOnePI(id);
    Object.assign(pi, updatePiDto);
    return this.piRepository.save(pi);
  }

  async removePI(id: string) {
    const pi = await this.findOnePI(id);
    return this.piRepository.remove(pi);
  }

  // Letter of Credit methods
  async createLC(createLcDto: CreateLetterOfCreditDto, userId: string) {
    const lc = this.lcRepository.create({
      ...createLcDto,
      created_by_id: userId,
    });
    return this.lcRepository.save(lc);
  }

  async findAllLCs(orderId?: string, userId?: string, userRole?: string) {
    const query = this.lcRepository
      .createQueryBuilder('lc')
      .leftJoinAndSelect('lc.order', 'order')
      .leftJoinAndSelect('lc.createdBy', 'createdBy');

    // Merchandisers only see their own LCs
    if (userRole === 'merchandiser' && userId) {
      query.andWhere('lc.created_by_id = :userId', { userId });
    }

    if (orderId) {
      query.andWhere('lc.order_id = :orderId', { orderId });
    }

    query.orderBy('lc.createdAt', 'DESC');
    return query.getMany();
  }

  async findOneLC(id: string) {
    const lc = await this.lcRepository.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!lc) {
      throw new NotFoundException(`Letter of Credit with ID ${id} not found`);
    }

    return lc;
  }

  async updateLC(id: string, updateLcDto: UpdateLetterOfCreditDto) {
    const lc = await this.findOneLC(id);
    Object.assign(lc, updateLcDto);
    return this.lcRepository.save(lc);
  }

  async removeLC(id: string) {
    const lc = await this.findOneLC(id);
    return this.lcRepository.remove(lc);
  }

  async getExpiringLCs(daysThreshold: number = 30) {
    const thresholdDate = addDays(new Date(), daysThreshold);
    
    return this.lcRepository.find({
      where: {
        status: LCStatus.RECEIVED,
        expiryDate: LessThan(thresholdDate),
      },
      relations: ['order'],
    });
  }

  private async generatePINumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PI${year}`;

    const lastPI = await this.piRepository
      .createQueryBuilder('pi')
      .where('pi.piNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('pi.piNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastPI) {
      const lastSequence = parseInt(lastPI.piNumber.replace(prefix, ''));
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }
}
