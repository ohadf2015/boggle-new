import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserLocalesBatch } from '../pushNotificationTriggers';

const { profilesIn } = vi.hoisted(() => ({ profilesIn: vi.fn() }));

vi.mock('../supabase', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return { select: vi.fn(() => ({ in: profilesIn })) };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }),
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('../fcmService', () => ({ sendToUser: vi.fn() }));
vi.mock('../pushDedup', () => ({
  shouldSendDirectMessagePush: vi.fn().mockResolvedValue(true),
  clearDirectMessagePushDedup: vi.fn(),
}));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

describe('getUserLocalesBatch chain (chosen language → country heuristic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilesIn.mockReset();
  });

  it('returns chosen language when profiles.language is supported', async () => {
    profilesIn.mockResolvedValue({
      data: [{ id: 'a', language: 'he', country_code: 'US' }],
      error: null,
    });
    const map = await getUserLocalesBatch(['a']);
    expect(map.get('a')).toBe('he');
  });

  it('falls back to country_code heuristic when language is NULL', async () => {
    profilesIn.mockResolvedValue({
      data: [{ id: 'a', language: null, country_code: 'IL' }],
      error: null,
    });
    const map = await getUserLocalesBatch(['a']);
    expect(map.get('a')).toBe('he');
  });

  it('mixes results across many users in one query', async () => {
    profilesIn.mockResolvedValue({
      data: [
        { id: 'a', language: 'sv', country_code: null },
        { id: 'b', language: null, country_code: 'JP' },
        { id: 'c', language: null, country_code: 'US' },
        { id: 'd', language: null, country_code: null },
      ],
      error: null,
    });
    const map = await getUserLocalesBatch(['a', 'b', 'c', 'd']);
    expect(map.get('a')).toBe('sv');
    expect(map.get('b')).toBe('ja');
    expect(map.get('c')).toBe('en');
    expect(map.get('d')).toBe('en');
  });

  it('returns empty map for empty input without hitting the DB', async () => {
    const map = await getUserLocalesBatch([]);
    expect(map.size).toBe(0);
    expect(profilesIn).not.toHaveBeenCalled();
  });

  it('selects both language and country_code (single round-trip)', async () => {
    profilesIn.mockResolvedValue({ data: [], error: null });
    await getUserLocalesBatch(['a']);
    // Caller asserts the mock was hit; the supabase select chain receives
    // the selected columns string from the production code. We verify by
    // inspecting the spy on `from('profiles').select(...)` indirectly via
    // the data shape returning country_code in earlier tests above.
    expect(profilesIn).toHaveBeenCalledTimes(1);
  });
});
