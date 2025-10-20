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
import { SamplesService } from './samples.service';
import { CreateSampleDto } from './dto/create-sample.dto';
import { UpdateSampleDto } from './dto/update-sample.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('samples')
@Controller('samples')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class SamplesController {
  constructor(private readonly samplesService: SamplesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Create a new sample' })
  async create(@Body() createSampleDto: CreateSampleDto) {
    return this.samplesService.create(createSampleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all samples' })
  async findAll(@Query('orderId') orderId?: string) {
    return this.samplesService.findAll(orderId);
  }

  @Get('pending-resubmissions')
  @ApiOperation({ summary: 'Get samples requiring resubmission plan' })
  async getPendingResubmissions() {
    return this.samplesService.getPendingResubmissions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sample by ID' })
  async findOne(@Param('id') id: string) {
    return this.samplesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Update sample' })
  async update(@Param('id') id: string, @Body() updateSampleDto: UpdateSampleDto) {
    return this.samplesService.update(id, updateSampleDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete sample' })
  async remove(@Param('id') id: string) {
    return this.samplesService.remove(id);
  }
}
