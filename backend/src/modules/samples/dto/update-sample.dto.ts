import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { CreateSampleDto } from './create-sample.dto';

export class UpdateSampleDto extends PartialType(CreateSampleDto) {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  receiptDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  responsiblePerson?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  resubmissionTargetDate?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  resubmissionPlanSet?: boolean;
}
