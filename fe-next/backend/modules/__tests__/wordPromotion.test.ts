/**
 * Tests for wordPromotion helper.
 * Shared `word_scores` upsert logic used by admin-approve and auto-promotion flows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promoteWordToScores } from '../wordPromotion';

type SupabaseArg = Parameters<typeof promoteWordToScores>[0];

describe('promoteWordToScores', () => {
  let mockUpsert: ReturnType<typeof vi.fn>;
  let mockSupabase: SupabaseArg;

  beforeEach(() => {
    mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase = {
      from: vi.fn(() => ({ upsert: mockUpsert })),
    } as unknown as SupabaseArg;
  });

  it('upserts into word_scores with admin_approved submitter and given votes', async () => {
    await promoteWordToScores(mockSupabase, 'battle', 'en', {
      votes: 20,
      submitter: 'admin_approved',
    });

    expect((mockSupabase.from as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('word_scores');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        word: 'battle',
        language: 'en',
        likes_count: 20,
        dislikes_count: 0,
        first_submitter: 'admin_approved',
      }),
      { onConflict: 'word,language' }
    );
    const row = mockUpsert.mock.calls[0][0];
    expect(typeof row.last_voted_at).toBe('string');
    expect(new Date(row.last_voted_at).toString()).not.toBe('Invalid Date');
  });

  it('upserts with auto_promoted submitter for auto-promotion path', async () => {
    await promoteWordToScores(mockSupabase, 'unit', 'en', {
      votes: 10,
      submitter: 'auto_promoted',
    });

    const row = mockUpsert.mock.calls[0][0];
    expect(row.first_submitter).toBe('auto_promoted');
    expect(row.likes_count).toBe(10);
  });

  it('marks the row immediately valid — externally-verified/admin-approved words must not depend on the real-voter threshold trigger', async () => {
    // Regression: word_scores_promote_on_threshold() only flips
    // is_potentially_valid on 2+ DISTINCT real `word_votes` rows, which
    // auto-promotion never writes. Without setting this explicitly, every
    // auto/admin-promoted word across every language stayed invisible to
    // live validation (checkCommunityWord / isWordCommunityValid) forever.
    await promoteWordToScores(mockSupabase, 'battle', 'en', { votes: 20, submitter: 'admin_approved' });
    expect(mockUpsert.mock.calls[0][0].is_potentially_valid).toBe(true);

    await promoteWordToScores(mockSupabase, 'unit', 'en', { votes: 10, submitter: 'auto_promoted' });
    expect(mockUpsert.mock.calls[1][0].is_potentially_valid).toBe(true);
  });

  it('propagates supabase upsert errors', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'db down' } });

    await expect(
      promoteWordToScores(mockSupabase, 'xyz', 'en', { votes: 10, submitter: 'auto_promoted' })
    ).rejects.toThrow('db down');
  });
});
