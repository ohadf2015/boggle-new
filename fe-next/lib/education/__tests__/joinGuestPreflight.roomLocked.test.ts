import { describe, it, expect, vi, afterEach } from 'vitest';

const { verdict } = vi.hoisted(() => ({ verdict: vi.fn(async () => 'game') }));
vi.mock('@/lib/education/joinCodeVerdict', () => ({ resolveJoinCodeVerdict: verdict }));

import { runGuestJoinPreflight } from '../joinGuestPreflight';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

describe('runGuestJoinPreflight — locked room', () => {
  it('refuses with ROOM_LOCKED before the guest account is created', async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ code: 'ROOM_LOCKED' }), { status: 423 })) as never;
    await expect(runGuestJoinPreflight('TZCOQ7', 'Dana')).resolves.toMatchObject({ code: 'ROOM_LOCKED' });
  });

  it('still reports a bad code first', async () => {
    verdict.mockResolvedValueOnce('invalid');
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ code: 'ROOM_LOCKED' }), { status: 423 })) as never;
    await expect(runGuestJoinPreflight('TZCOQ7', 'Dana')).resolves.toMatchObject({ code: 'INVALID_CODE' });
  });
});
