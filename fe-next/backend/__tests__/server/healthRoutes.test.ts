import { vi, type Mock, type MockInstance } from 'vitest';
import express from 'express';
import request from 'supertest';
import { configureHealthRoutes } from '@/server/healthRoutes';
import { getRedisClient } from '../../redisClient';
import { checkPoolHealth } from '../../db/supabasePool';

// Mock Redis
vi.mock('ioredis', () => {
  return vi.fn().mockImplementation(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue('OK'),
  }));
});

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
      })),
    })),
  })),
}));

// Mock backend dependencies
vi.mock('../../redisClient', () => ({
  isRedisAvailable: vi.fn(() => true),
  getRedisMetrics: vi.fn().mockResolvedValue({ connected: true }),
  getRedisClient: vi.fn(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
  })),
}));

vi.mock('../../redis/circuitBreaker', () => ({
  circuitBreaker: {
    getState: vi.fn(() => ({ state: 'CLOSED', failureCount: 0 })),
  },
}));

vi.mock('../../db/supabasePool', () => ({
  checkPoolHealth: vi.fn().mockResolvedValue({ ok: true, latencyMs: 5 }),
}));

vi.mock('../../modules/gameStateManager', () => ({
  getAllGames: vi.fn(() => []),
}));

vi.mock('../../utils/metrics', () => ({
  getMetrics: vi.fn(() => ({})),
  getRoomMetrics: vi.fn(() => ({})),
  resetAll: vi.fn(),
}));

vi.mock('../../dictionary', () => ({
  getMemoryStats: vi.fn(() => [{ language: 'en', wordCount: 100, estimatedBytes: 1024 }]),
}));

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
    vi.clearAllMocks();
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
      vi.mocked(getRedisClient).mockReturnValueOnce({
        ping: vi.fn().mockRejectedValue(new Error('Connection refused')),
      } as any);

      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
      expect(res.body.checks.redis.status).toBe('error');
      expect(res.body.checks.redis.error).toContain('Connection refused');
    });

    it('returns degraded when Supabase pool check fails', async () => {
      vi.mocked(checkPoolHealth).mockResolvedValueOnce({ ok: false, latencyMs: 10, error: 'No pool' } as any);

      const res = await request(app).get('/health/ready');
      expect(res.body.checks.supabase.status).toBe('error');
      expect(res.body.status).toBe('degraded');
    });
  });
});
