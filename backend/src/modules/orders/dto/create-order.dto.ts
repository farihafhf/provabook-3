import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, OrderCategory } from '../../../common/enums/order-status.enum';

class ColorQuantityItem {
  @ApiProperty({ example: 'Navy Blue' })
  @IsString()
  color: string;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'ABC Textiles Ltd.' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: 'XYZ Brands', required: false })
  @IsString()
  @IsOptional()
  buyerName?: string;

  @ApiProperty({ example: 'ST-2025-001', required: false })
  @IsString()
  @IsOptional()
  styleNumber?: string;

  @ApiProperty({ example: 'Cotton Poplin' })
  @IsString()
  @IsNotEmpty()
  fabricType: string;

  @ApiProperty({ example: '100% Cotton, 60x60, 130 GSM', required: false })
  @IsString()
  @IsOptional()
  fabricSpecifications?: string;

  @ApiProperty({ example: '100% Cotton', required: false })
  @IsString()
  @IsOptional()
  fabricComposition?: string;

  @ApiProperty({ example: 180, required: false })
  @IsNumber()
  @IsOptional()
  gsm?: number;

  @ApiProperty({ example: 'Peach Finish', required: false })
  @IsString()
  @IsOptional()
  finishType?: string;

  @ApiProperty({ example: '30/1 Combed Ring Spun', required: false })
  @IsString()
  @IsOptional()
  construction?: string;

  @ApiProperty({ example: 'ABC Textile Mills', required: false })
  @IsString()
  @IsOptional()
  millName?: string;

  @ApiProperty({ example: 2.50, required: false })
  @IsNumber()
  @IsOptional()
  millPrice?: number;

  @ApiProperty({ example: 2.85, required: false })
  @IsNumber()
  @IsOptional()
  provaPrice?: number;

  @ApiProperty({ example: 'USD', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ example: 'meters', default: 'meters' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ 
    type: [ColorQuantityItem],
    required: false,
    example: [
      { color: 'White', quantity: 2000 },
      { color: 'Navy', quantity: 1500 }
    ]
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ColorQuantityItem)
  colorQuantityBreakdown?: ColorQuantityItem[];

  @ApiProperty({ example: ['Red', 'Blue', 'Green'], required: false })
  @IsArray()
  @IsOptional()
  colorways?: string[];

  @ApiProperty({ example: '2025-03-01', required: false })
  @IsDateString()
  @IsOptional()
  etd?: string;

  @ApiProperty({ example: '2025-03-15', required: false })
  @IsDateString()
  @IsOptional()
  eta?: string;

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
