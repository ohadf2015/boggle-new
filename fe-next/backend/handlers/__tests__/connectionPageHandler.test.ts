/**
 * connectionPageHandler tests
 * Covers: pageView event stores normalized route on socket.data.page
 */

vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  default: { checkRateLimit: vi.fn().mockReturnValue(true) },
}));

import { vi, type MockedFunction } from 'vitest';
import { registerConnectionPageHandler } from '../connectionPageHandler';
import { checkRateLimit } from '../../utils/rateLimiter';

const mockCheckRateLimit = checkRateLimit as MockedFunction<typeof checkRateLimit>;

function createTestHarness() {
  const handlers = new Map<string, Function>();
  const socket: any = {
    id: 'socket-1',
    data: {},
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
    }),
  };
  const io: any = { to: vi.fn().mockReturnThis(), emit: vi.fn() };

  registerConnectionPageHandler(io, socket);

  const trigger = (event: string, data?: any) => {
    const handler = handlers.get(event);
    if (!handler) throw new Error(`No handler for ${event}`);
    return handler(data);
  };

  return { socket, io, trigger, handlers };
}

describe('connectionPageHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
  });

  it('registers a pageView handler', () => {
    const { handlers } = createTestHarness();
    expect(handlers.has('pageView')).toBe(true);
  });

  it('stores the normalized path on socket.data.page', () => {
    const { socket, trigger } = createTestHarness();
    trigger('pageView', { path: '/he/multiplayer?foo=1' });
    expect(socket.data.page).toBe('/multiplayer');
  });

  it('collapses dynamic id segments', () => {
    const { socket, trigger } = createTestHarness();
    trigger('pageView', { path: '/profile/8f3c1a2b9d4e' });
    expect(socket.data.page).toBe('/profile/:id');
  });

  it('sets page to null when no valid path is supplied', () => {
    const { socket, trigger } = createTestHarness();
    trigger('pageView', {});
    expect(socket.data.page).toBeNull();
    trigger('pageView', { path: 123 });
    expect(socket.data.page).toBeNull();
  });

  it('ignores the event when rate limited (keeps prior page)', () => {
    const { socket, trigger } = createTestHarness();
    trigger('pageView', { path: '/daily' });
    mockCheckRateLimit.mockReturnValue(false);
    trigger('pageView', { path: '/multiplayer' });
    expect(socket.data.page).toBe('/daily');
  });
});
