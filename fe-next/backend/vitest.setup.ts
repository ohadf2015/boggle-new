/**
 * Vitest Setup File for Backend Tests
 */
import { vi } from 'vitest';

// Mock translations module
vi.mock('../translations/index.js', () => ({
  translations: {
    en: { achievements: {}, game: {}, errors: {} },
    he: { achievements: {}, game: {}, errors: {} },
    sv: { achievements: {}, game: {}, errors: {} },
    ja: { achievements: {}, game: {}, errors: {} },
    es: { achievements: {}, game: {}, errors: {} },
  },
}));

// Global mock for ioredis to prevent real Redis connections in any test
vi.mock('ioredis', () => {
  const RedisMock = vi.fn().mockImplementation(() => ({
    status: 'ready',
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue('OK'),
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    scan: vi.fn().mockResolvedValue(['0', []]),
    pipeline: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) }),
    multi: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) }),
    script: vi.fn().mockResolvedValue('mock-sha'),
    evalsha: vi.fn().mockResolvedValue(null),
    on: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    duplicate: vi.fn().mockReturnThis(),
    info: vi.fn().mockResolvedValue('used_memory:1000\r\nused_memory_peak:2000'),
  }));
  return { default: RedisMock, Redis: RedisMock };
});
