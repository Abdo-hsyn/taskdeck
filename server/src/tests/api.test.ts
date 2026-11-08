import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Env must exist before importing the app (it validates at import time).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'mysql://user:pass@localhost:3306/taskdeck';
process.env.JWT_SECRET ??= 'test-secret';
process.env.CLIENT_ORIGINS ??= 'http://localhost:5173';

const { createApp } = await import('../app.js');

describe('TaskDeck API', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  afterAll(() => {
    // Nothing to tear down — no DB connections are opened in these tests.
  });

  describe('GET /api/health', () => {
    it('returns ok with uptime', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.uptime).toBe('number');
    });
  });

  describe('error envelope', () => {
    it('returns 404 with {error:{message,code}} for unknown routes', async () => {
      const res = await request(app).get('/api/nope');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(typeof res.body.error.message).toBe('string');
    });

    it('rejects malformed JSON bodies with a 400 envelope', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ not json');
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('auth guard', () => {
    it('401s on protected routes without a cookie', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('401s on /auth/me without a cookie', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('401s with an invalid token cookie', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', 'taskdeck_token=garbage');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('validation', () => {
    it('rejects a register body that fails Zod with 400 VALIDATION', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'x', email: 'not-an-email', password: 'short' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION');
    });
  });

  describe('security headers', () => {
    it('sets Helmet headers', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });
});
