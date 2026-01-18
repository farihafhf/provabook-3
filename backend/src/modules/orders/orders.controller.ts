import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';
import { OrderStatus, OrderCategory } from '../../common/enums/order-status.enum';

@ApiTags('orders')
@Controller('orders')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Create a new order' })
  async create(@Body() createOrderDto: CreateOrderDto, @CurrentUser('id') userId: string) {
    return this.ordersService.create(createOrderDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'category', enum: OrderCategory, required: false })
  @ApiQuery({ name: 'merchandiserId', type: String, required: false })
  async findAll(
    @Query('status') status?: OrderStatus,
    @Query('category') category?: OrderCategory,
    @Query('merchandiserId') merchandiserId?: string,
    @CurrentUser() user?: any,
  ) {
    // If user is a merchandiser, only show their orders
    const effectiveMerchandiserId = 
      user?.role === UserRole.MERCHANDISER 
        ? user.id 
        : merchandiserId;
    
    return this.ordersService.findAll({ status, category, merchandiserId: effectiveMerchandiserId });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get order statistics' })
  async getStats(@CurrentUser() user: any) {
    const merchandiserId = user.role === UserRole.MERCHANDISER ? user.id : undefined;
    return this.ordersService.getOrderStats(merchandiserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Update order' })
  async update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Delete order' })
  async remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }

  @Patch(':id/approvals')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Update order approval status' })
  async updateApproval(
    @Param('id') id: string,
    @Body() body: { approvalType: string; status: string },
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateApproval(id, body.approvalType, body.status, user);
  }

  @Post(':id/change-stage')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Change order stage' })
  async changeStage(
    @Param('id') id: string,
    @Body() body: { stage: string },
    @CurrentUser() user: any,
  ) {
    return this.ordersService.changeStage(id, body.stage, user);
  }

  // Document Management Endpoints

  @Post(':id/documents/upload')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Upload document to order' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        category: {
          type: 'string',
          enum: ['sample', 'lc', 'pi', 'test_report', 'email', 'other'],
        },
        subcategory: {
          type: 'string',
          enum: ['lab_dip', 'strike_off', 'quality_test', 'bulk_swatch', 'pp_sample'],
          nullable: true,
        },
        description: {
          type: 'string',
          nullable: true,
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') orderId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    // Manually construct DTO from body (multipart form data comes as strings)
    const uploadDocumentDto: UploadDocumentDto = {
      category: body.category,
      subcategory: body.subcategory || undefined,
      description: body.description || undefined,
    };

    return this.ordersService.uploadDocument(orderId, file, uploadDocumentDto, user);
  }

  @Get('documents/:documentId/signed-url')
  @ApiOperation({ summary: 'Get a fresh signed URL for a document' })
  async getDocumentSignedUrl(@Param('documentId') documentId: string) {
    return this.ordersService.getDocumentSignedUrl(documentId);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get all documents for an order' })
  @ApiQuery({ name: 'category', required: false, type: String })
  async getOrderDocuments(
    @Param('id') orderId: string,
    @Query('category') category?: string,
  ) {
    return this.ordersService.getOrderDocuments(orderId, category);
  }

  @Delete('documents/:documentId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Delete a document' })
  async deleteDocument(
    @Param('documentId') documentId: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.deleteDocument(documentId, user);
  }
}
