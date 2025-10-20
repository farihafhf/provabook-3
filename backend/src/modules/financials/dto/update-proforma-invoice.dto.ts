import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { CreateProformaInvoiceDto } from './create-proforma-invoice.dto';

export class UpdateProformaInvoiceDto extends PartialType(CreateProformaInvoiceDto) {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  sentDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  confirmedDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  documentUrl?: string;
}
