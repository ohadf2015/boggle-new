import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSocketURL } from '../SocketContext';

/**
 * Regression: the dev build hardcoded `http://localhost:3001`, but the unified
 * custom server (server/index.ts) serves Next + Socket.IO on the SAME port
 * (PORT, which is often 3000). The hardcode dialed a dead 3001 → app stuck
 * "OFFLINE". getSocketURL must resolve same-origin instead.
 */
describe('getSocketURL', () => {
  afterEach(() => vi.unstubAllEnvs());

  const sameOrigin = () => `${window.location.protocol}//${window.location.host}`;

  it('resolves same-origin (Socket.IO lives on the page port)', () => {
    expect(getSocketURL()).toBe(sameOrigin());
  });

  it('does NOT hardcode :3001 in development — the OFFLINE bug', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(getSocketURL()).not.toContain('3001');
    expect(getSocketURL()).toBe(sameOrigin());
  });

  it('honors NEXT_PUBLIC_WS_URL, converting ws/wss → http/https', () => {
    vi.stubEnv('NEXT_PUBLIC_WS_URL', 'wss://api.example.com');
    expect(getSocketURL()).toBe('https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_WS_URL', 'ws://localhost:9999');
    expect(getSocketURL()).toBe('http://localhost:9999');
  });
});
