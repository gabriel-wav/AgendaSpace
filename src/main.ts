import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

function validateRequiredEnvVars() {
  const required = ['DATABASE_URL', 'MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `[Startup Error] As seguintes variáveis de ambiente obrigatórias não foram configuradas: ${missing.join(', ')}. Verifique seu arquivo .env ou .env.local.`,
    );
  }
}

async function bootstrap() {
  validateRequiredEnvVars();

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));

  const frontendUrl = process.env.FRONTEND_URL;
  const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    ...(frontendUrl ? [frontendUrl] : []),
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (como mobile apps, curl, ferramentas locais de teste)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`Origem CORS não permitida: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 AgendaSpace Backend running on http://localhost:${port}`);
}
bootstrap();

