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
import { ProductionService } from './production.service';
import { CreateProductionMetricDto } from './dto/create-production-metric.dto';
import { UpdateProductionMetricDto } from './dto/update-production-metric.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('production')
@Controller('production')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post('metrics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER, UserRole.FIELD_STAFF)
  @ApiOperation({ summary: 'Create a new production metric' })
  async create(@Body() createProductionMetricDto: CreateProductionMetricDto) {
    return this.productionService.create(createProductionMetricDto);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get all production metrics' })
  async findAll(
    @Query('orderId') orderId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.productionService.findAll(orderId, start, end);
  }

  @Get('metrics/stats/:orderId')
  @ApiOperation({ summary: 'Get production statistics for an order' })
  async getOrderStats(@Param('orderId') orderId: string) {
    return this.productionService.getOrderProductionStats(orderId);
  }

  @Get('metrics/:id')
  @ApiOperation({ summary: 'Get production metric by ID' })
  async findOne(@Param('id') id: string) {
    return this.productionService.findOne(id);
  }

  @Patch('metrics/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER, UserRole.FIELD_STAFF)
  @ApiOperation({ summary: 'Update production metric' })
  async update(@Param('id') id: string, @Body() updateProductionMetricDto: UpdateProductionMetricDto) {
    return this.productionService.update(id, updateProductionMetricDto);
  }

  @Delete('metrics/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete production metric' })
  async remove(@Param('id') id: string) {
    return this.productionService.remove(id);
  }
}
