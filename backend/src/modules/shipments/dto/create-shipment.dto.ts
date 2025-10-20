import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsDateString, IsUUID } from 'class-validator';
import { ShipmentStatus, ShipmentMode } from '../../../common/enums/shipment.enum';

export class CreateShipmentDto {
  @ApiProperty({ enum: ShipmentStatus, default: ShipmentStatus.PENDING })
  @IsEnum(ShipmentStatus)
  @IsOptional()
  status?: ShipmentStatus;

  @ApiProperty({ enum: ShipmentMode, default: ShipmentMode.SEA })
  @IsEnum(ShipmentMode)
  @IsOptional()
  mode?: ShipmentMode;

  @ApiProperty({ example: 'AWB123456', required: false })
  @IsString()
  @IsOptional()
  awbNumber?: string;

  @ApiProperty({ example: 'DHL', required: false })
  @IsString()
  @IsOptional()
  courierName?: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ example: 'meters', default: 'meters' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: '2024-02-01', required: false })
  @IsDateString()
  @IsOptional()
  estimatedDepartureDate?: string;

  @ApiProperty({ example: '2024-02-15', required: false })
  @IsDateString()
  @IsOptional()
  estimatedArrivalDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'uuid-of-order' })
  @IsUUID()
  @IsNotEmpty()
  order_id: string;
}
