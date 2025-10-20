import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsDateString, IsUUID } from 'class-validator';
import { SampleType, SampleStatus } from '../../../common/enums/sample.enum';

export class CreateSampleDto {
  @ApiProperty({ enum: SampleType, example: SampleType.LAB_DIP })
  @IsEnum(SampleType)
  @IsNotEmpty()
  type: SampleType;

  @ApiProperty({ example: 1, default: 1 })
  @IsNumber()
  @IsOptional()
  version?: number;

  @ApiProperty({ enum: SampleStatus, default: SampleStatus.PENDING })
  @IsEnum(SampleStatus)
  @IsOptional()
  status?: SampleStatus;

  @ApiProperty({ example: '2024-01-15', required: false })
  @IsDateString()
  @IsOptional()
  submissionDate?: string;

  @ApiProperty({ example: 'John Buyer', required: false })
  @IsString()
  @IsOptional()
  recipient?: string;

  @ApiProperty({ example: 'DHL', required: false })
  @IsString()
  @IsOptional()
  courierName?: string;

  @ApiProperty({ example: 'AWB123456', required: false })
  @IsString()
  @IsOptional()
  awbNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'uuid-of-order' })
  @IsUUID()
  @IsNotEmpty()
  order_id: string;
}
