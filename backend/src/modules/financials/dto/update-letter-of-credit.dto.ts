import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { CreateLetterOfCreditDto } from './create-letter-of-credit.dto';

export class UpdateLetterOfCreditDto extends PartialType(CreateLetterOfCreditDto) {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  receiptDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  documentUrl?: string;
}
