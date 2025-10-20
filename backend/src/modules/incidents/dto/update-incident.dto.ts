import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { CreateIncidentDto } from './create-incident.dto';

export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  actualResolutionDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resolution?: string;
}
