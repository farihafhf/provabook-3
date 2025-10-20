import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsDateString, IsUUID } from 'class-validator';
import { PIStatus } from '../../../common/enums/financial.enum';

export class CreateProformaInvoiceDto {
  @ApiProperty({ example: 1, default: 1 })
  @IsNumber()
  @IsOptional()
  version?: number;

  @ApiProperty({ enum: PIStatus, default: PIStatus.DRAFT })
  @IsEnum(PIStatus)
  @IsOptional()
  status?: PIStatus;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 'USD', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: '2024-01-15', required: false })
  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'uuid-of-order' })
  @IsUUID()
  @IsNotEmpty()
  order_id: string;
}
