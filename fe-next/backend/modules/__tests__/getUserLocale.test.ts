import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserLocale } from '../pushNotificationTriggers';

const { profilesMaybeSingle } = vi.hoisted(() => ({
  profilesMaybeSingle: vi.fn(),
}));

vi.mock('../supabase', () => {
  function makeProfilesQuery() {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: profilesMaybeSingle })),
      })),
    };
  }
  return {
    getSupabase: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === 'profiles') return makeProfilesQuery();
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    })),
    isSupabaseConfigured: vi.fn(() => true),
  };
});

vi.mock('../fcmService', () => ({ sendToUser: vi.fn() }));
vi.mock('../pushDedup', () => ({
  shouldSendDirectMessagePush: vi.fn().mockResolvedValue(true),
  clearDirectMessagePushDedup: vi.fn(),
}));

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../utils/logger', () => ({ default: mockLogger }));

describe('getUserLocale fallback chain (chosen language → country heuristic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilesMaybeSingle.mockReset();
  });

  it('returns profiles.language when populated and supported (chosen language wins)', async () => {
    profilesMaybeSingle.mockResolvedValue({ data: { language: 'he', country_code: 'US' }, error: null });
    expect(await getUserLocale('u1')).toBe('he');
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('does NOT consult game_sessions even when profiles.language is NULL — game language ≠ UI language', async () => {
    profilesMaybeSingle.mockResolvedValue({ data: { language: null, country_code: 'IL' }, error: null });
    // The query for game_sessions should never be issued under the new chain;
    // result here is purely from country_code heuristic.
    expect(await getUserLocale('u2')).toBe('he');
  });

  it('falls back to country_code heuristic when profiles.language is NULL', async () => {
    profilesMaybeSingle.mockResolvedValue({ data: { language: null, country_code: 'JP' }, error: null });
    expect(await getUserLocale('u3')).toBe('ja');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'PUSH_TRIGGER',
      expect.stringContaining('country_code'),
      expect.objectContaining({ userId: 'u3', country: 'JP' })
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('defaults to en when no chosen language and unmapped country (debug-only)', async () => {
    profilesMaybeSingle.mockResolvedValue({ data: { language: null, country_code: 'US' }, error: null });
    expect(await getUserLocale('u4')).toBe('en');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'PUSH_TRIGGER',
      expect.stringContaining('default'),
      expect.objectContaining({ userId: 'u4' })
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('defaults to en when country_code is NULL', async () => {
    profilesMaybeSingle.mockResolvedValue({ data: { language: null, country_code: null }, error: null });
    expect(await getUserLocale('u5')).toBe('en');
  });

  it('returns en cleanly when profile row missing entirely', async () => {
    profilesMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getUserLocale('u6')).toBe('en');
  });

  it('returns en when profiles.language holds an unsupported value', async () => {
    profilesMaybeSingle.mockResolvedValue({ data: { language: 'fr', country_code: 'IL' }, error: null });
    // 'fr' is not a supported push locale → falls through to country heuristic.
    expect(await getUserLocale('u7')).toBe('he');
  });
});
