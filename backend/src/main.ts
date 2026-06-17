import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ClearCacheInterceptor } from './common/interceptors/clear-cache.interceptor';
import cookieParser from 'cookie-parser';

// Globally configure BigInt serialization for JSON responses
Object.defineProperty(BigInt.prototype, 'toJSON', {
  value: function (this: bigint) {
    return this.toString();
  },
});

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust proxy headers for correct protocol detection behind reverse proxies
  app.set('trust proxy', 1);

  // Enable CORS with credentials support
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : [
          'http://localhost:5173',
          'http://localhost:3000',
          'https://asaa-fp-a.vercel.app',
        ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-tenant-id',
      'x-company-id',
    ],
  });

  // Cookie parser for reading HttpOnly cookies
  app.use(cookieParser());

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Register global cache clearing interceptor
  app.useGlobalInterceptors(new ClearCacheInterceptor());

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('idiibi FP&A Suite API')
    .setDescription('The API documentation for the idiibi FP&A SaaS system.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(
    `Swagger documentation available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap().catch((err: unknown) => {
  console.error('Error starting server:', err);
});
// Watch reload trigger comment to pick up DTO changes
