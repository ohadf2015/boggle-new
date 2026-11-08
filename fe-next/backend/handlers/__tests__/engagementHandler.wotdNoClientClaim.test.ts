/**
 * The word-of-the-day coins used to be paid on a client-sent
 * `engagement:recordWotd` with `found: true`, which any signed-in socket could
 * send for any word. No client sends it; the award now comes only from the
 * daily Word Wheel's server-checked golden word.
 */
import { vi, describe, it, expect } from 'vitest';
import type { Server, Socket } from 'socket.io';

vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});
vi.mock('../../utils/socketHelpers', () => ({ safeEmit: vi.fn() }));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));
const awardCoinsServer = vi.fn().mockResolvedValue({ success: true, newBalance: 50 });
vi.mock('../../services/economy/awardCoins', () => ({ awardCoinsServer: (...a: unknown[]) => awardCoinsServer(...a) }));
const chain: Record<string, unknown> = {};
for (const m of ['from', 'select', 'eq', 'insert', 'upsert', 'update']) chain[m] = () => chain;
chain.single = async () => ({ data: null, error: null });
chain.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null, count: 0 }).then(ok);
vi.mock('../../modules/supabaseServer', () => ({ getSupabase: () => chain }));

import { registerEngagementHandlers } from '../engagementHandler';

describe('engagement:recordWotd is gone', () => {
  it('Given a signed-in client sending found:true, When it emits engagement:recordWotd, Then nothing handles it and no coins are paid', async () => {
    const handlers = new Map<string, (...a: unknown[]) => unknown>();
    const socket = {
      id: 's1',
      emit: vi.fn(),
      on: (event: string, fn: (...a: unknown[]) => unknown) => handlers.set(event, fn),
      data: { verifiedUserId: 'player-1' },
    } as unknown as Socket;
    registerEngagementHandlers({} as Server, socket);

    await handlers.get('engagement:recordWotd')?.({ word: 'crystal', found: true, language: 'en' });

    expect(handlers.has('engagement:recordWotd')).toBe(false);
    expect(awardCoinsServer).not.toHaveBeenCalled();
  });
});
