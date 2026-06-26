import { vi, type Mock, describe, it, expect } from 'vitest';

/**
 * Blast v2 progress GET route tests — Plan 3b (save/resume progress).
 *
 * The route reads blast_progress for the authenticated user so the client can
 * resume at current_level with real coins/chest state. Auth is handled in the
 * GET wrapper; handleGetBlastProgress takes a pre-validated userId.
 *
 * TDD: written before implementation (RED phase).
 */

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { handleGetBlastProgress, handleClaimBlastProgress } from '../_handlers';

interface MockSupabase {
  from: Mock;
  __insert: Mock;
  __upsert: Mock;
  __update: Mock;
}

function createMockSupabase({
  selectData = null,
  selectError = null,
}: {
  selectData?: Record<string, unknown> | null;
  selectError?: { message: string } | null;
} = {}): MockSupabase {
  const __insert = vi.fn().mockResolvedValue({ error: null });
  const __upsert = vi.fn().mockResolvedValue({ error: null });
  const __update = vi.fn();
  return {
    __insert,
    __upsert,
    __update,
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: selectData, error: selectError }),
        }),
      }),
      insert: __insert,
      upsert: __upsert,
      update: vi.fn((payload: Record<string, unknown>) => {
        __update(payload);
        return { eq: vi.fn().mockResolvedValue({ error: null }) };
      }),
    }),
  };
}

describe('handleGetBlastProgress', () => {
  it('maps a full blast_progress row to the resume payload', async () => {
    const mockSupabase = createMockSupabase({
      selectData: {
        current_level: 7,
        max_level_cleared: 6,
        total_coins_earned_blast: 540,
        current_chest_number: 2,
        current_chest_progress: 0.35,
        unlocks_seen: { coinOverlay: true },
        locale: 'he',
      },
    });

    const result = await handleGetBlastProgress('user-123', mockSupabase);

    expect(result.status).toBe(200);
    expect(result.data).toEqual({
      currentLevel: 7,
      maxLevelCleared: 6,
      coins: 540,
      chestNumber: 2,
      chestProgress: 0.35,
      unlocksSeen: { coinOverlay: true },
      locale: 'he',
    });
  });

  it('coins comes from total_coins_earned_blast (matches clear-level response)', async () => {
    const mockSupabase = createMockSupabase({
      selectData: {
        current_level: 3,
        max_level_cleared: 2,
        total_coins_earned_blast: 999,
        current_chest_number: 1,
        current_chest_progress: 0.1,
        unlocks_seen: {},
        locale: 'en',
      },
    });

    const result = await handleGetBlastProgress('user-123', mockSupabase);
    expect(result.data.coins).toBe(999);
  });

  it('returns defaults (no row) without writing anything', async () => {
    const mockSupabase = createMockSupabase({
      selectData: null,
      selectError: { message: 'No rows found' },
    });

    const result = await handleGetBlastProgress('user-123', mockSupabase, 'en');

    expect(result.status).toBe(200);
    expect(result.data).toEqual({
      currentLevel: 1,
      maxLevelCleared: 0,
      coins: 0,
      chestNumber: 1,
      chestProgress: 0,
      unlocksSeen: {},
      locale: 'en',
    });
    // A GET must never lazily create the row — that's clear-level's job.
    expect(mockSupabase.__insert).not.toHaveBeenCalled();
    expect(mockSupabase.__upsert).not.toHaveBeenCalled();
  });

  it('uses the provided defaultLocale when there is no row', async () => {
    const mockSupabase = createMockSupabase({
      selectData: null,
      selectError: { message: 'No rows found' },
    });

    const result = await handleGetBlastProgress('user-123', mockSupabase, 'ja');
    expect(result.data.locale).toBe('ja');
    expect(result.data.currentLevel).toBe(1);
  });

  it('returns 500 on an unexpected database error', async () => {
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('db crash')),
        }),
      }),
    });

    const result = await handleGetBlastProgress('user-123', { from } as unknown as MockSupabase);
    expect(result.status).toBe(500);
  });
});

describe('handleClaimBlastProgress (guest → server resume position)', () => {
  it('bumps current_level to the claimed level when higher — and NEVER touches max_level_cleared', async () => {
    const mockSupabase = createMockSupabase({ selectData: { current_level: 3, max_level_cleared: 2 } });

    const result = await handleClaimBlastProgress('user-123', mockSupabase, 8);

    expect(result.status).toBe(200);
    expect(result.data.currentLevel).toBe(8);
    expect(mockSupabase.__update).toHaveBeenCalledTimes(1);
    const payload = mockSupabase.__update.mock.calls[0][0];
    expect(payload).toMatchObject({ current_level: 8 });
    // Critical: max_level_cleared stays earned-only (veteran bonus / future ranking safe).
    expect(payload).not.toHaveProperty('max_level_cleared');
  });

  it('is a no-op when the claimed level is not higher than the server level', async () => {
    const mockSupabase = createMockSupabase({ selectData: { current_level: 10, max_level_cleared: 9 } });

    const result = await handleClaimBlastProgress('user-123', mockSupabase, 4);

    expect(result.status).toBe(200);
    expect(result.data.currentLevel).toBe(10);
    expect(mockSupabase.__update).not.toHaveBeenCalled();
  });

  it('creates the row at the claimed level when none exists (max_level_cleared stays 0)', async () => {
    const mockSupabase = createMockSupabase({ selectData: null, selectError: { message: 'No rows found' } });

    const result = await handleClaimBlastProgress('user-123', mockSupabase, 6, 'sv');

    expect(result.status).toBe(200);
    expect(result.data.currentLevel).toBe(6);
    expect(mockSupabase.__insert).toHaveBeenCalledTimes(1);
    const payload = mockSupabase.__insert.mock.calls[0][0];
    expect(payload).toMatchObject({ user_id: 'user-123', current_level: 6, locale: 'sv' });
    expect(payload).not.toHaveProperty('max_level_cleared');
  });

  it('rejects an absurd claim level (anti-tamper) as a no-op', async () => {
    const mockSupabase = createMockSupabase({ selectData: { current_level: 5, max_level_cleared: 4 } });

    const result = await handleClaimBlastProgress('user-123', mockSupabase, 999999);

    expect(result.status).toBe(200);
    expect(result.data.currentLevel).toBe(5);
    expect(mockSupabase.__update).not.toHaveBeenCalled();
  });

  it('rejects a non-positive / non-integer claim level as a no-op', async () => {
    const mockSupabase = createMockSupabase({ selectData: { current_level: 5, max_level_cleared: 4 } });

    expect((await handleClaimBlastProgress('user-123', mockSupabase, 0)).data.currentLevel).toBe(5);
    expect((await handleClaimBlastProgress('user-123', mockSupabase, 2.5)).data.currentLevel).toBe(5);
    expect(mockSupabase.__update).not.toHaveBeenCalled();
  });
});
