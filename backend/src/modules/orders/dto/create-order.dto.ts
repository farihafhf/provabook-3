import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsDateString,
} from 'class-validator';
import { OrderStatus, OrderCategory } from '../../../common/enums/order-status.enum';

export class CreateOrderDto {
  @ApiProperty({ example: 'ABC Textiles Ltd.' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: 'XYZ Brands', required: false })
  @IsString()
  @IsOptional()
  buyerName?: string;

  @ApiProperty({ example: 'Cotton Poplin' })
  @IsString()
  @IsNotEmpty()
  fabricType: string;

  @ApiProperty({ example: '100% Cotton, 60x60, 130 GSM', required: false })
  @IsString()
  @IsOptional()
  fabricSpecifications?: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ example: 'meters', default: 'meters' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: ['Red', 'Blue', 'Green'], required: false })
  @IsArray()
  @IsOptional()
  colorways?: string[];

  @ApiProperty({ enum: OrderStatus, default: OrderStatus.UPCOMING })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiProperty({ enum: OrderCategory, default: OrderCategory.UPCOMING })
  @IsEnum(OrderCategory)
  @IsOptional()
  category?: OrderCategory;

  @ApiProperty({ example: '2024-01-15', required: false })
  @IsDateString()
  @IsOptional()
  orderDate?: string;

  @ApiProperty({ example: '2024-03-15', required: false })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
