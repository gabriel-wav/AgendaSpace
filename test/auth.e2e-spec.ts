import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Authentication and Authorization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUserToken: string;
  let testAdminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authorization Flow', () => {
    it('/profiles/me (GET) - Unauthenticated should fail', () => {
      return request(app.getHttpServer())
        .get('/profiles/me')
        .expect(401);
    });
  });

  describe('Concurrency Tests', () => {
    it('Should handle concurrent login requests gracefully', async () => {
      // We will create a test user
      const uniqueEmail = `test_concurrent_${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Concurrent User',
          email: uniqueEmail,
          password: 'Password123!',
        })
        .expect(201);
      
      // Attempt to login concurrently 5 times
      const reqs = Array.from({ length: 5 }).map(() =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: uniqueEmail,
            password: 'Password123!',
          })
      );
      
      const responses = await Promise.all(reqs);
      
      // Depending on the 2FA or Unverified state, it might return 403 (Verify Email) or 201 (Success)
      for (const res of responses) {
        expect([201, 403]).toContain(res.status);
      }
    });
  });
});
