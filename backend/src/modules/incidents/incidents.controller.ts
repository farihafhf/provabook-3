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
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';
import { IncidentStatus } from '../../common/enums/incident.enum';

@ApiTags('incidents')
@Controller('incidents')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER, UserRole.QA)
  @ApiOperation({ summary: 'Create a new incident' })
  async create(@Body() createIncidentDto: CreateIncidentDto) {
    return this.incidentsService.create(createIncidentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all incidents' })
  async findAll(@Query('orderId') orderId?: string, @Query('status') status?: IncidentStatus) {
    return this.incidentsService.findAll(orderId, status);
  }

  @Get('open')
  @ApiOperation({ summary: 'Get all open incidents' })
  async getOpenIncidents() {
    return this.incidentsService.getOpenIncidents();
  }

  @Get('critical')
  @ApiOperation({ summary: 'Get all critical incidents' })
  async getCriticalIncidents() {
    return this.incidentsService.getCriticalIncidents();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get incident by ID' })
  async findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER, UserRole.QA)
  @ApiOperation({ summary: 'Update incident' })
  async update(@Param('id') id: string, @Body() updateIncidentDto: UpdateIncidentDto) {
    return this.incidentsService.update(id, updateIncidentDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete incident' })
  async remove(@Param('id') id: string) {
    return this.incidentsService.remove(id);
  }
}
