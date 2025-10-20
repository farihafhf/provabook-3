import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Document } from '../../database/entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';

// Multer file type
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class DocumentsService {
  private supabase: SupabaseClient;

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly configService: ConfigService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL') || '',
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '',
    );
  }

  async create(createDocumentDto: CreateDocumentDto) {
    const document = this.documentRepository.create(createDocumentDto);
    return this.documentRepository.save(document);
  }

  async findAll(orderId?: string) {
    const query = this.documentRepository.createQueryBuilder('document');

    if (orderId) {
      query.where('document.order_id = :orderId', { orderId });
    }

    query.orderBy('document.createdAt', 'DESC');
    return query.getMany();
  }

  async findOne(id: string) {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
  }

  async remove(id: string) {
    const document = await this.findOne(id);
    
    // Delete from Supabase Storage
    try {
      const { error } = await this.supabase.storage
        .from('documents')
        .remove([document.storagePath]);
      
      if (error) {
        console.error('Error deleting from storage:', error);
      }
    } catch (error) {
      console.error('Error deleting from storage:', error);
    }

    return this.documentRepository.remove(document);
  }

  async getSignedUrl(id: string, expiresIn: number = 3600) {
    const document = await this.findOne(id);

    const { data, error } = await this.supabase.storage
      .from('documents')
      .createSignedUrl(document.storagePath, expiresIn);

    if (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return { signedUrl: data.signedUrl, document };
  }

  async uploadDocument(
    file: MulterFile,
    uploadedBy: string,
    orderId?: string,
    documentType?: string,
    description?: string,
  ) {
    const fileName = `${Date.now()}-${file.originalname}`;
    const storagePath = orderId ? `orders/${orderId}/${fileName}` : `general/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from('documents')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Save document metadata to database
    const document = await this.create({
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      storagePath: data.path,
      documentType,
      description,
      uploadedBy,
      order_id: orderId,
    });

    return document;
  }
}
