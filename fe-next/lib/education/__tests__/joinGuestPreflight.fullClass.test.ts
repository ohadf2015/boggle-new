import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/education/joinCodeVerdict', () => ({ resolveJoinCodeVerdict: vi.fn(async () => 'class-join') }));

import { runGuestJoinPreflight } from '../joinGuestPreflight';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

describe('runGuestJoinPreflight — full class', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses before the guest account is created when the class has no seat', async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ code: 'STUDENT_LIMIT_REACHED' }), { status: 403 })) as never;
    await expect(runGuestJoinPreflight('ABC123', 'Dana')).resolves.toMatchObject({ code: 'STUDENT_LIMIT_REACHED' });
  });

  it('carries on through an outage of the name check', async () => {
    global.fetch = vi.fn(async () => new Response('boom', { status: 500 })) as never;
    await expect(runGuestJoinPreflight('ABC123', 'Dana')).resolves.toBeNull();
  });
});
