import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SpacesModule } from './spaces/spaces.module';
import { BookingsModule } from './bookings/bookings.module';
import { FeedModule } from './feed/feed.module';
import { UsersModule } from './users/users.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/agendaspace',
    ),
    // Serve arquivos estáticos de public/uploads em /uploads/*
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public', 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,         // Não procurar index.html
        fallthrough: true,    // Deixar passar para as rotas do NestJS se não encontrar
      },
    }),
    PrismaModule,
    AuthModule,
    SpacesModule,
    BookingsModule,
    FeedModule,
    UsersModule,
    UploadModule,
  ],
})
export class AppModule {}
