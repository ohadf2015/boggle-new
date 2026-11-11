import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/lib/education/joinCodeVerdict', () => ({ resolveJoinCodeVerdict: vi.fn(async () => 'game') }));

import { runGuestJoinPreflight } from '../joinGuestPreflight';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

describe('runGuestJoinPreflight — a name the class screen cannot show', () => {
  it('Given the server refuses the name, When the guest checks in, Then it is refused before an account exists, with a fun name to take', async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ code: 'NAME_NOT_ALLOWED', suggestedName: 'Pixel Panda' }), { status: 422 })) as never;
    await expect(runGuestJoinPreflight('TZCOQ7', 'rude')).resolves.toMatchObject({ code: 'NAME_NOT_ALLOWED', suggestedName: 'Pixel Panda' });
  });
});
