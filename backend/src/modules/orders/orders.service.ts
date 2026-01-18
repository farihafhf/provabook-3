import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { Document } from '../../database/entities/document.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { OrderStatus, OrderCategory } from '../../common/enums/order-status.enum';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly activityLogService: ActivityLogService,
    private readonly supabaseStorageService: SupabaseStorageService,
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

  async updateApproval(orderId: string, approvalType: string, status: string, user: any) {
    const order = await this.findOne(orderId);

    // Initialize approvalStatus if it doesn't exist
    if (!order.approvalStatus) {
      order.approvalStatus = {};
    }

    // Update the specific approval
    order.approvalStatus[approvalType] = status as any;

    // Save the order
    const updatedOrder = await this.orderRepository.save(order);

    // Log the activity
    await this.activityLogService.logActivity({
      userId: user.id,
      userEmail: user.email,
      action: 'UPDATE_APPROVAL',
      entityType: 'Order',
      entityId: orderId,
      metadata: {
        merchandiser_id: order.merchandiser_id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        buyerName: order.buyerName,
        approvalType,
        newStatus: status,
        userName: user.fullName || user.email,
      },
    });

    return updatedOrder;
  }

  async changeStage(orderId: string, newStage: string, user: any) {
    const order = await this.findOne(orderId);
    const oldStage = order.currentStage;

    order.currentStage = newStage;

    // Update category based on stage
    if (newStage === 'Design') {
      order.category = OrderCategory.UPCOMING;
    } else if (newStage === 'In Development' || newStage === 'Production') {
      order.category = OrderCategory.RUNNING;
    } else if (newStage === 'Delivered') {
      order.category = OrderCategory.ARCHIVED;
      order.actualDeliveryDate = new Date();
    }

    const updatedOrder = await this.orderRepository.save(order);

    // Log the activity
    await this.activityLogService.logActivity({
      userId: user.id,
      userEmail: user.email,
      action: 'CHANGE_STAGE',
      entityType: 'Order',
      entityId: orderId,
      metadata: {
        merchandiser_id: order.merchandiser_id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        buyerName: order.buyerName,
        oldStage,
        newStage,
        userName: user.fullName || user.email,
      },
    });

    return updatedOrder;
  }

  // Document Management Methods

  async uploadDocument(
    orderId: string,
    file: Express.Multer.File,
    uploadDocumentDto: UploadDocumentDto,
    user: any,
  ) {
    try {
      // Verify order exists
      const order = await this.findOne(orderId);

      // Upload file to Supabase
      const { path, url } = await this.supabaseStorageService.uploadFile(orderId, file);

      // Create document record
      const document = this.documentRepository.create({
        order_id: orderId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storagePath: path,
        fileUrl: url,
        category: uploadDocumentDto.category,
        subcategory: uploadDocumentDto.subcategory,
        description: uploadDocumentDto.description,
        uploadedBy: user.id,
        uploadedByName: user.fullName || user.email,
      });

      const savedDocument = await this.documentRepository.save(document);

      // Log activity
      await this.activityLogService.logActivity({
        userId: user.id,
        userEmail: user.email,
        action: 'UPLOAD_DOCUMENT',
        entityType: 'Order',
        entityId: orderId,
        metadata: {
          merchandiser_id: order.merchandiser_id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          buyerName: order.buyerName,
          documentId: savedDocument.id,
          fileName: file.originalname,
          category: uploadDocumentDto.category,
          userName: user.fullName || user.email,
        },
      });

      return savedDocument;
    } catch (error) {
      console.error('Upload document error:', error);
      throw new BadRequestException(
        error.message || 'Failed to upload document'
      );
    }
  }

  async getOrderDocuments(orderId: string, category?: string) {
    const query = this.documentRepository
      .createQueryBuilder('document')
      .where('document.order_id = :orderId', { orderId })
      .orderBy('document.createdAt', 'DESC');

    if (category) {
      query.andWhere('document.category = :category', { category });
    }

    return query.getMany();
  }

  async getDocumentSignedUrl(documentId: string) {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Generate a fresh signed URL (valid for 1 hour)
    const signedUrl = await this.supabaseStorageService.getSignedUrl(
      document.storagePath,
      3600,
    );

    return {
      id: document.id,
      fileName: document.fileName,
      fileType: document.fileType,
      signedUrl,
    };
  }

  async deleteDocument(documentId: string, user: any) {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['order'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Delete from Supabase Storage
    await this.supabaseStorageService.deleteFile(document.storagePath);

    // Delete from database
    await this.documentRepository.remove(document);

    // Log activity
    await this.activityLogService.logActivity({
      userId: user.id,
      userEmail: user.email,
      action: 'DELETE_DOCUMENT',
      entityType: 'Order',
      entityId: document.order_id,
      metadata: {
        orderNumber: document.order?.orderNumber,
        customerName: document.order?.customerName,
        buyerName: document.order?.buyerName,
        fileName: document.fileName,
        category: document.category,
        userName: user.fullName || user.email,
      },
    });

    return { message: 'Document deleted successfully' };
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
