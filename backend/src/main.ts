import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: false,
  });
  const configService = app.get(ConfigService);

  // CORS - Support multiple origins (comma-separated)
  const frontendUrls = configService.get('FRONTEND_URL') || 'http://localhost:3001';
  const allowedOrigins = frontendUrls.split(',').map((url: string) => url.trim());
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global prefix
  const apiPrefix = configService.get('API_PREFIX') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Provabook API')
    .setDescription('Textile Operations Management Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('orders', 'Order management')
    .addTag('samples', 'Sample tracking')
    .addTag('financials', 'PI and LC management')
    .addTag('production', 'Production tracking')
    .addTag('incidents', 'Incident management')
    .addTag('shipments', 'Shipment tracking')
    .addTag('notifications', 'Notification system')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('PORT') || 3000;
  await app.listen(port, '0.0.0.0'); // Listen on all network interfaces for mobile access
  
  console.log(`🚀 Provabook Backend is running on: http://localhost:${port}`);
  console.log(`📱 Mobile Access: http://192.168.68.60:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
