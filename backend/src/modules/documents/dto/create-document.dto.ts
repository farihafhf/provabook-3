import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({ example: 'order-po.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  fileType: string;

  @ApiProperty({ example: 1024000 })
  @IsNumber()
  @IsNotEmpty()
  fileSize: number;

  @ApiProperty({ example: 'orders/uuid/file.pdf' })
  @IsString()
  @IsNotEmpty()
  storagePath: string;

  @ApiProperty({ example: 'PO', required: false })
  @IsString()
  @IsOptional()
  documentType?: string;

  @ApiProperty({ example: 'Purchase Order document', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'uuid-of-user' })
  @IsUUID()
  @IsNotEmpty()
  uploadedBy: string;

  @ApiProperty({ example: 'uuid-of-order', required: false })
  @IsUUID()
  @IsOptional()
  order_id?: string;
}
