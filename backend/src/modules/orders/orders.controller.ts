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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
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
  ) {
    return this.ordersService.findAll({ status, category, merchandiserId });
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
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete order' })
  async remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
