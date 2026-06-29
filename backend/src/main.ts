import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { ClearCacheInterceptor } from './common/interceptors/clear-cache.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';

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
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOriginRaw = process.env.CORS_ORIGIN;

  // In production, only use explicitly configured CORS origins (no localhost fallback)
  // In development, allow localhost defaults as fallback
  const defaultOrigins = isProduction
    ? []
    : ['http://localhost:5173', 'http://localhost:3000'];

  const configuredOrigins = corsOriginRaw
    ? corsOriginRaw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : [];

  const allowedOrigins = [
    ...new Set([...configuredOrigins, ...defaultOrigins]),
  ];

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
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

  // Configure body parser limits for file uploads (base64 in JSON body)
  // 50MB limit — base64 encoding adds ~33% overhead, so this supports ~37MB raw files
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Global exception filter for friendly error messages
  app.useGlobalFilters(new AllExceptionsFilter());

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

  // Swagger — only in non-production unless ENABLE_SWAGGER=true
  const enableSwagger = process.env.ENABLE_SWAGGER === 'true' || !isProduction;

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Harvest Suite API')
      .setDescription(
        'The API documentation for the Harvest Financial Planning & Analysis system.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
  if (enableSwagger) {
    console.log(
      `Swagger documentation available at: http://localhost:${port}/api/docs`,
    );
  }
}
bootstrap().catch((err: unknown) => {
  console.error('Error starting server:', err);
});
// Watch reload trigger comment to pick up DTO changes
