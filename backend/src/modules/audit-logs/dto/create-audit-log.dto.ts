import { IsString, IsNotEmpty, IsOptional, IsUUID, IsObject } from 'class-validator';

export class CreateAuditLogDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  userEmail: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsUUID()
  @IsOptional()
  entityId?: string;

  @IsObject()
  @IsOptional()
  oldValues?: Record<string, any>;

  @IsObject()
  @IsOptional()
  newValues?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
