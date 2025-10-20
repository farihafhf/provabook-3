import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialsController } from './financials.controller';
import { FinancialsService } from './financials.service';
import { ProformaInvoice } from '../../database/entities/proforma-invoice.entity';
import { LetterOfCredit } from '../../database/entities/letter-of-credit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProformaInvoice, LetterOfCredit])],
  controllers: [FinancialsController],
  providers: [FinancialsService],
  exports: [FinancialsService],
})
export class FinancialsModule {}
