import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { CreateShipmentDto } from './create-shipment.dto';

export class UpdateShipmentDto extends PartialType(CreateShipmentDto) {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  actualDepartureDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  actualArrivalDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  packingListUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceUrl?: string;
}
