import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase accessor before importing the module under test.
const singleMock = vi.fn();
const getSupabaseMock = vi.fn();
vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: () => getSupabaseMock(),
}));

import {
  resolveSocketSocialContext,
  ensureSocialCapability,
  clearSocketSocialContextCache,
} from '../socialPolicyServer';

const CURRENT_YEAR = new Date().getUTCFullYear();

function fakeSupabaseReturning(row: Record<string, unknown> | null) {
  singleMock.mockResolvedValue({ data: row, error: null });
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ single: singleMock }),
      }),
    }),
  };
}

interface FakeSocket {
  data: Record<string, unknown>;
  handshake: { auth: Record<string, unknown> };
}

function makeSocket(opts: { verifiedUserId?: string | null; declaredBirthYear?: number }): FakeSocket {
  return {
    data: { verifiedUserId: opts.verifiedUserId ?? null },
    handshake: { auth: opts.declaredBirthYear ? { declaredBirthYear: opts.declaredBirthYear } : {} },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveSocketSocialContext — authenticated users', () => {
  it('grants full capabilities to an adult profile', async () => {
    getSupabaseMock.mockReturnValue(
      fakeSupabaseReturning({ birth_year: CURRENT_YEAR - 30, social_features_override: null }),
    );
    const socket = makeSocket({ verifiedUserId: 'u1' });
    const ctx = await resolveSocketSocialContext(socket as never);
    expect(ctx.tier).toBe('adult');
    expect(ctx.caps.publicRoomChat).toBe(true);
    expect(ctx.caps.friendMessaging).toBe(true);
  });

  it('restricts a child profile out of all freeform/stranger surfaces', async () => {
    getSupabaseMock.mockReturnValue(
      fakeSupabaseReturning({ birth_year: CURRENT_YEAR - 9, social_features_override: null }),
    );
    const socket = makeSocket({ verifiedUserId: 'kid' });
    const ctx = await resolveSocketSocialContext(socket as never);
    expect(ctx.tier).toBe('child');
    expect(ctx.caps.publicRoomChat).toBe(false);
    expect(ctx.caps.friendMessaging).toBe(false);
    expect(ctx.caps.customDisplayName).toBe(false);
  });

  it('applies an adult-set override to raise a child capability', async () => {
    getSupabaseMock.mockReturnValue(
      fakeSupabaseReturning({
        birth_year: CURRENT_YEAR - 9,
        social_features_override: { friendMessaging: true, friendManagement: true },
      }),
    );
    const socket = makeSocket({ verifiedUserId: 'kid' });
    const ctx = await resolveSocketSocialContext(socket as never);
    expect(ctx.caps.friendMessaging).toBe(true);
    expect(ctx.caps.publicRoomChat).toBe(false); // not in override → still off
  });

  it('treats an authed profile with no birth_year as unknown (restricted)', async () => {
    getSupabaseMock.mockReturnValue(
      fakeSupabaseReturning({ birth_year: null, social_features_override: null }),
    );
    const socket = makeSocket({ verifiedUserId: 'novalue' });
    const ctx = await resolveSocketSocialContext(socket as never);
    expect(ctx.tier).toBe('unknown');
    expect(ctx.caps.publicRoomChat).toBe(false);
  });
});

describe('resolveSocketSocialContext — guests', () => {
  it('uses the self-declared handshake birth year (adult)', async () => {
    const socket = makeSocket({ verifiedUserId: null, declaredBirthYear: CURRENT_YEAR - 25 });
    const ctx = await resolveSocketSocialContext(socket as never);
    expect(ctx.tier).toBe('adult');
    expect(ctx.caps.publicRoomChat).toBe(true);
    expect(getSupabaseMock).not.toHaveBeenCalled(); // no DB hit for guests
  });

  it('treats a guest with no declared age as unknown (restricted)', async () => {
    const socket = makeSocket({ verifiedUserId: null });
    const ctx = await resolveSocketSocialContext(socket as never);
    expect(ctx.tier).toBe('unknown');
    expect(ctx.caps.publicRoomChat).toBe(false);
  });

  it('treats a self-declared child guest as restricted', async () => {
    const socket = makeSocket({ verifiedUserId: null, declaredBirthYear: CURRENT_YEAR - 8 });
    const ctx = await resolveSocketSocialContext(socket as never);
    expect(ctx.tier).toBe('child');
    expect(ctx.caps.publicRoomChat).toBe(false);
  });
});

describe('memoization', () => {
  it('resolves once per socket and caches the result', async () => {
    getSupabaseMock.mockReturnValue(
      fakeSupabaseReturning({ birth_year: CURRENT_YEAR - 30, social_features_override: null }),
    );
    const socket = makeSocket({ verifiedUserId: 'u1' });
    await resolveSocketSocialContext(socket as never);
    await resolveSocketSocialContext(socket as never);
    expect(singleMock).toHaveBeenCalledTimes(1);
  });

  it('re-resolves after the cache is cleared (age-set reconnect)', async () => {
    getSupabaseMock.mockReturnValue(
      fakeSupabaseReturning({ birth_year: CURRENT_YEAR - 30, social_features_override: null }),
    );
    const socket = makeSocket({ verifiedUserId: 'u1' });
    await resolveSocketSocialContext(socket as never);
    clearSocketSocialContextCache(socket as never);
    await resolveSocketSocialContext(socket as never);
    expect(singleMock).toHaveBeenCalledTimes(2);
  });
});

describe('ensureSocialCapability', () => {
  it('returns true when the capability is allowed', async () => {
    getSupabaseMock.mockReturnValue(
      fakeSupabaseReturning({ birth_year: CURRENT_YEAR - 30, social_features_override: null }),
    );
    const socket = makeSocket({ verifiedUserId: 'u1' });
    expect(await ensureSocialCapability(socket as never, 'publicRoomChat')).toBe(true);
  });

  it('returns false when the capability is restricted', async () => {
    const socket = makeSocket({ verifiedUserId: null }); // unknown guest
    expect(await ensureSocialCapability(socket as never, 'publicRoomChat')).toBe(false);
  });
});
