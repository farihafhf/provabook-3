import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsDateString, IsUUID } from 'class-validator';
import { LCStatus } from '../../../common/enums/financial.enum';

export class CreateLetterOfCreditDto {
  @ApiProperty({ example: 'LC2024001' })
  @IsString()
  @IsNotEmpty()
  lcNumber: string;

  @ApiProperty({ enum: LCStatus, default: LCStatus.PENDING })
  @IsEnum(LCStatus)
  @IsOptional()
  status?: LCStatus;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 'USD', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  @IsNotEmpty()
  issueDate: string;

  @ApiProperty({ example: '2024-07-15' })
  @IsDateString()
  @IsNotEmpty()
  expiryDate: string;

  @ApiProperty({ example: 'Standard Chartered Bank', required: false })
  @IsString()
  @IsOptional()
  issuingBank?: string;

  @ApiProperty({ example: 'HSBC', required: false })
  @IsString()
  @IsOptional()
  advisingBank?: string;

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
