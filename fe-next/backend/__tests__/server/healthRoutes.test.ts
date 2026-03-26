import express from 'express';
import request from 'supertest';
import { configureHealthRoutes } from '@/server/healthRoutes';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
      })),
    })),
  })),
}));

// Mock backend dependencies
jest.mock('../../redisClient', () => ({
  isRedisAvailable: jest.fn(() => true),
  getRedisMetrics: jest.fn().mockResolvedValue({ connected: true }),
}));

jest.mock('../../modules/gameStateManager', () => ({
  getAllGames: jest.fn(() => []),
}));

jest.mock('../../utils/metrics', () => ({
  getMetrics: jest.fn(() => ({})),
  getRoomMetrics: jest.fn(() => ({})),
  resetAll: jest.fn(),
}));

// Mock dictionary module — no isLoaded export
jest.mock('../../dictionary', () => ({}));

function createApp() {
  const app = express();
  const mockIo = {
    sockets: { sockets: { size: 0 } },
  } as unknown as import('socket.io').Server;
  configureHealthRoutes(app, mockIo);
  return app;
}

describe('Health Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health/live', () => {
    it('returns alive status', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('returns ok status with uptime', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /health/ready', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    });

    afterEach(() => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    });

    it('returns structured checks object when all healthy', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.checks).toBeDefined();
      expect(res.body.checks.redis.status).toBe('ok');
      expect(typeof res.body.checks.redis.latencyMs).toBe('number');
      expect(res.body.checks.supabase.status).toBe('ok');
      expect(res.body.checks.dictionary.status).toBe('ok');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.timestamp).toBeDefined();
    });

    it('returns degraded when Redis fails', async () => {
      const IoRedis = require('ioredis');
      IoRedis.mockImplementationOnce(() => ({
        ping: jest.fn().mockRejectedValue(new Error('Connection refused')),
        quit: jest.fn().mockResolvedValue('OK'),
      }));

      app = createApp();
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
      expect(res.body.checks.redis.status).toBe('error');
      expect(res.body.checks.redis.error).toContain('Connection refused');
    });

    it('skips Supabase check when env vars missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const res = await request(app).get('/health/ready');
      expect(res.body.checks.supabase.status).toBe('skipped');
    });
  });
});
