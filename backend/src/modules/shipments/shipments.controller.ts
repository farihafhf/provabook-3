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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';
import { ShipmentStatus } from '../../common/enums/shipment.enum';

@ApiTags('shipments')
@Controller('shipments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER, UserRole.LOGISTICS)
  @ApiOperation({ summary: 'Create a new shipment' })
  async create(@Body() createShipmentDto: CreateShipmentDto) {
    return this.shipmentsService.create(createShipmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shipments' })
  async findAll(@Query('orderId') orderId?: string, @Query('status') status?: ShipmentStatus) {
    return this.shipmentsService.findAll(orderId, status);
  }

  @Get('in-transit')
  @ApiOperation({ summary: 'Get all in-transit shipments' })
  async getInTransitShipments() {
    return this.shipmentsService.getInTransitShipments();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipment by ID' })
  async findOne(@Param('id') id: string) {
    return this.shipmentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER, UserRole.LOGISTICS)
  @ApiOperation({ summary: 'Update shipment' })
  async update(@Param('id') id: string, @Body() updateShipmentDto: UpdateShipmentDto) {
    return this.shipmentsService.update(id, updateShipmentDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete shipment' })
  async remove(@Param('id') id: string) {
    return this.shipmentsService.remove(id);
  }
}
