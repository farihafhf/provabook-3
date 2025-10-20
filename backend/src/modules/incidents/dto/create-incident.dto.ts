import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { IncidentType, IncidentStatus, IncidentSeverity } from '../../../common/enums/incident.enum';

export class CreateIncidentDto {
  @ApiProperty({ example: 'Quality Issue in Batch 123' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Color mismatch found in production batch' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: IncidentType, example: IncidentType.QUALITY_REJECTION })
  @IsEnum(IncidentType)
  @IsNotEmpty()
  type: IncidentType;

  @ApiProperty({ enum: IncidentStatus, default: IncidentStatus.OPEN })
  @IsEnum(IncidentStatus)
  @IsOptional()
  status?: IncidentStatus;

  @ApiProperty({ enum: IncidentSeverity, default: IncidentSeverity.MEDIUM })
  @IsEnum(IncidentSeverity)
  @IsOptional()
  severity?: IncidentSeverity;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  @IsNotEmpty()
  incidentDate: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cause?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  actionPlan?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  responsiblePerson?: string;

  @ApiProperty({ example: '2024-01-20', required: false })
  @IsDateString()
  @IsOptional()
  targetResolutionDate?: string;

  @ApiProperty({ example: 'uuid-of-order' })
  @IsUUID()
  @IsNotEmpty()
  order_id: string;
}
