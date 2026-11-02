import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/daily/questSeams', async (orig) => ({
  ...(await orig<typeof import('@/lib/daily/questSeams')>()),
  creditDailyQuests: vi.fn(),
}));

import { processConnectionsCompletion } from '../processCompletion';

function admin() {
  const inserts: Array<Record<string, unknown>> = [];
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    or: () => b,
    insert: (row: Record<string, unknown>) => (inserts.push(row), b),
    update: () => b,
    maybeSingle: async () => ({ data: null }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ error: null, count: 0 }).then(resolve),
  };
  return { client: { from: () => b }, inserts };
}

async function submit(displayName: string, guest: boolean) {
  const db = admin();
  const sub = { puzzleDate: '2026-01-15', language: 'en', displayName, score: 300, timeTakenSeconds: 40, puzzlesSolved: 3 };
  await processConnectionsCompletion(sub, {
    sub,
    idCol: guest ? 'guest_fingerprint' : 'player_id',
    idVal: guest ? 'g-1' : 'p-1',
    userIdForRow: guest ? null : 'p-1',
    guestIdForRow: guest ? 'g-1' : null,
    profile: null,
    avatarOverrides: {},
    admin: db.client,
  });
  return db.inserts[0];
}

describe('processConnectionsCompletion — guest board name', () => {
  it('Given a guest on a generated default name, Then the row stores the plain fallback instead', async () => {
    expect((await submit('Sneaky Potato', true)).display_name).toBe('Player');
  });

  it('Given a guest with a profane name, Then the row stores the plain fallback', async () => {
    expect((await submit('shit', true)).display_name).toBe('Player');
  });

  it('Given a guest who picked a name, Then the row keeps it', async () => {
    expect((await submit('Zigzag', true)).display_name).toBe('Zigzag');
  });

  it('Given a localized fallback, Then the row keeps it', async () => {
    expect((await submit('Jugador', true)).display_name).toBe('Jugador');
  });

  it('Given a signed-in player, Then the submitted name is stored as is', async () => {
    expect((await submit('Sneaky Potato', false)).display_name).toBe('Sneaky Potato');
  });
});
