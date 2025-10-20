import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';

// Multer file type
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('documents')
@Controller('documents')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document' })
  async uploadDocument(
    @UploadedFile() file: MulterFile,
    @CurrentUser('id') userId: string,
    @Body('orderId') orderId?: string,
    @Body('documentType') documentType?: string,
    @Body('description') description?: string,
  ) {
    return this.documentsService.uploadDocument(file, userId, orderId, documentType, description);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents' })
  async findAll(@Query('orderId') orderId?: string) {
    return this.documentsService.findAll(orderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get signed URL for document download' })
  async getDownloadUrl(@Param('id') id: string) {
    return this.documentsService.getSignedUrl(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Delete document' })
  async remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
