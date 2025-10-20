import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SamplesModule } from './modules/samples/samples.module';
import { FinancialsModule } from './modules/financials/financials.module';
import { ProductionModule } from './modules/production/production.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { DocumentsModule } from './modules/documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // Always use migrations in production
        logging: configService.get('NODE_ENV') === 'development',
        ssl: { rejectUnauthorized: false }, // Supabase requires SSL in all environments
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    OrdersModule,
    SamplesModule,
    FinancialsModule,
    ProductionModule,
    IncidentsModule,
    ShipmentsModule,
    NotificationsModule,
    AuditLogsModule,
    DocumentsModule,
  ],
})
export class AppModule {}
