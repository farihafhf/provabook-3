import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsBoolean, IsUUID } from 'class-validator';

export class CreateProductionMetricDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  @IsNotEmpty()
  productionDate: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @IsNotEmpty()
  quantityProduced: number;

  @ApiProperty({ example: 'meters', default: 'meters' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: 'M-101', required: false })
  @IsString()
  @IsOptional()
  machineNumber?: string;

  @ApiProperty({ example: 'Day', required: false })
  @IsString()
  @IsOptional()
  shift?: string;

  @ApiProperty({ example: 'John Smith', required: false })
  @IsString()
  @IsOptional()
  operator?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  qualityNotes?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  hasIssues?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  issues?: string;
}
