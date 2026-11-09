import { describe, it, expect } from 'vitest';
import { coerceLeaderboardVisibility, DEFAULT_LEADERBOARD_VISIBILITY } from '../types';

describe('coerceLeaderboardVisibility', () => {
  it('keeps every value the column allows', () => {
    for (const v of ['full', 'top3', 'personal_only', 'hidden']) expect(coerceLeaderboardVisibility(v)).toBe(v);
  });

  it('treats a pre-migration row (no column) and junk as the friendly default', () => {
    expect(DEFAULT_LEADERBOARD_VISIBILITY).toBe('top3');
    for (const v of [undefined, null, '', 'everyone', 3]) expect(coerceLeaderboardVisibility(v)).toBe('top3');
  });
});
