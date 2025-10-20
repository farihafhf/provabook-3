import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { NotificationType, NotificationPriority } from '../../../common/enums/notification.enum';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({ enum: NotificationPriority, default: NotificationPriority.MEDIUM })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiProperty({ example: 'New Order Created' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Order PB20240001 has been created' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: 'Order', required: false })
  @IsString()
  @IsOptional()
  relatedEntityType?: string;

  @ApiProperty({ example: 'uuid', required: false })
  @IsUUID()
  @IsOptional()
  relatedEntityId?: string;

  @ApiProperty({ example: 'uuid-of-user' })
  @IsUUID()
  @IsNotEmpty()
  user_id: string;
}
