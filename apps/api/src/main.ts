import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ApiErrorFilter } from './common/error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);
  app.enableCors({ origin: config.get('CORS_ORIGIN', 'http://localhost:5173'), credentials: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new ApiErrorFilter());
  await app.listen(config.get<number>('PORT', 3000), '0.0.0.0');
}
void bootstrap();
