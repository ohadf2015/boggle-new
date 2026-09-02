/**
 * Signup Conversion Tests
 *
 * Covers the ordering guarantee getAllGuestDailyResults() must uphold: it feeds
 * syncGuestDailyResultsToAccount(), which replays each guest result through
 * /api/daily-challenge/word-hunt/submit to migrate a guest's history onto a
 * freshly authenticated player_id. The update_word_hunt_player_stats() DB
 * trigger (migration 067) derives current_streak by comparing each submitted
 * row's puzzle_date against the previously stored last_played_date, so it only
 * reconstructs the correct streak if the rows are replayed oldest-first.
 * getAllWordHuntResults() (mocked below) returns each language newest-first,
 * so without re-sorting here the combined, multi-language list would be
 * date-scrambled and the guest's streak would come out wrong right at signup.
 */

import type { Language } from '@/types';
import type { StoredWordHuntResult } from '../types';

const mockGetAllWordHuntResults = vi.fn();

vi.mock('../storage', () => ({
  getAllWordHuntResults: (language: Language) => mockGetAllWordHuntResults(language),
}));

import { getAllGuestDailyResults } from '../signupConversion';

function stubResult(date: string, language: Language, puzzleNumber: number): StoredWordHuntResult {
  return {
    date,
    puzzleNumber,
    completedAt: `${date}T00:00:00.000Z`,
    result: {
      puzzleNumber,
      puzzleDate: date,
      language,
      solved: true,
      attemptsUsed: 3,
      targetWord: 'WORD',
      attempts: [],
      streakDays: 1,
      completedAt: `${date}T00:00:00.000Z`,
    },
  };
}

describe('getAllGuestDailyResults', () => {
  beforeEach(() => {
    mockGetAllWordHuntResults.mockReset();
  });

  it('returns the combined multi-language history sorted oldest puzzleDate first', () => {
    // GIVEN - per-language storage each comes back newest-first (as
    // getAllWordHuntResults really sorts), and the languages themselves are
    // interleaved out of date order.
    mockGetAllWordHuntResults.mockImplementation((language: Language) => {
      if (language === 'en') {
        return [stubResult('2026-08-20', 'en', 103), stubResult('2026-08-18', 'en', 101)];
      }
      if (language === 'he') {
        return [stubResult('2026-08-19', 'he', 102)];
      }
      return [];
    });

    // WHEN
    const results = getAllGuestDailyResults();

    // THEN - chronological regardless of which language contributed each day
    expect(results.map((r) => r.puzzleDate)).toEqual(['2026-08-18', '2026-08-19', '2026-08-20']);
  });

  it('returns an empty array when the guest has no stored results', () => {
    mockGetAllWordHuntResults.mockReturnValue([]);

    expect(getAllGuestDailyResults()).toEqual([]);
  });
});
