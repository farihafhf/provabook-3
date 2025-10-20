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
import { FinancialsService } from './financials.service';
import { CreateProformaInvoiceDto } from './dto/create-proforma-invoice.dto';
import { UpdateProformaInvoiceDto } from './dto/update-proforma-invoice.dto';
import { CreateLetterOfCreditDto } from './dto/create-letter-of-credit.dto';
import { UpdateLetterOfCreditDto } from './dto/update-letter-of-credit.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('financials')
@Controller('financials')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class FinancialsController {
  constructor(private readonly financialsService: FinancialsService) {}

  // Proforma Invoice endpoints
  @Post('proforma-invoices')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Create a new Proforma Invoice' })
  async createPI(@Body() createPiDto: CreateProformaInvoiceDto) {
    return this.financialsService.createPI(createPiDto);
  }

  @Get('proforma-invoices')
  @ApiOperation({ summary: 'Get all Proforma Invoices' })
  async findAllPIs(@Query('orderId') orderId?: string) {
    return this.financialsService.findAllPIs(orderId);
  }

  @Get('proforma-invoices/:id')
  @ApiOperation({ summary: 'Get Proforma Invoice by ID' })
  async findOnePI(@Param('id') id: string) {
    return this.financialsService.findOnePI(id);
  }

  @Patch('proforma-invoices/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Update Proforma Invoice' })
  async updatePI(@Param('id') id: string, @Body() updatePiDto: UpdateProformaInvoiceDto) {
    return this.financialsService.updatePI(id, updatePiDto);
  }

  @Delete('proforma-invoices/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete Proforma Invoice' })
  async removePI(@Param('id') id: string) {
    return this.financialsService.removePI(id);
  }

  // Letter of Credit endpoints
  @Post('letters-of-credit')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Create a new Letter of Credit' })
  async createLC(@Body() createLcDto: CreateLetterOfCreditDto) {
    return this.financialsService.createLC(createLcDto);
  }

  @Get('letters-of-credit')
  @ApiOperation({ summary: 'Get all Letters of Credit' })
  async findAllLCs(@Query('orderId') orderId?: string) {
    return this.financialsService.findAllLCs(orderId);
  }

  @Get('letters-of-credit/expiring')
  @ApiOperation({ summary: 'Get LCs expiring soon' })
  async getExpiringLCs(@Query('days') days?: number) {
    return this.financialsService.getExpiringLCs(days || 30);
  }

  @Get('letters-of-credit/:id')
  @ApiOperation({ summary: 'Get Letter of Credit by ID' })
  async findOneLC(@Param('id') id: string) {
    return this.financialsService.findOneLC(id);
  }

  @Patch('letters-of-credit/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER)
  @ApiOperation({ summary: 'Update Letter of Credit' })
  async updateLC(@Param('id') id: string, @Body() updateLcDto: UpdateLetterOfCreditDto) {
    return this.financialsService.updateLC(id, updateLcDto);
  }

  @Delete('letters-of-credit/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete Letter of Credit' })
  async removeLC(@Param('id') id: string) {
    return this.financialsService.removeLC(id);
  }
}
