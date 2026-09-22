import { describe, expect, it } from 'vitest';
import { evaluateRoundRecords } from '../roundRecords';
import type { ChallengeHighScores } from '../../highScoreManager';

function history(partial: Partial<ChallengeHighScores> = {}): ChallengeHighScores {
  return {
    scores: {},
    allTimeBest: null,
    totalGamesPlayed: 0,
    totalHighScoreBeats: 0,
    ...partial,
  };
}

const entry = {
  score: 80,
  wordCount: 4,
  longestWord: 'planet',
  achievedAt: 1,
};

describe('evaluateRoundRecords', () => {
  it('badges the first positive score and the first word, not a zero score', () => {
    expect(evaluateRoundRecords(0, '', history())).toEqual({
      scoreIsRecord: false, wordIsRecord: false,
    });
    expect(evaluateRoundRecords(12, 'cat', history())).toEqual({
      scoreIsRecord: true, wordIsRecord: true,
    });
  });

  it('badges only a strictly better score or a strictly longer word', () => {
    const prior = history({
      allTimeBest: entry,
      scores: { MEDIUM_120: entry },
      longestEver: 'planet',
    });
    expect(evaluateRoundRecords(80, 'planet', prior)).toEqual({
      scoreIsRecord: false, wordIsRecord: false,
    });
    expect(evaluateRoundRecords(81, 'planets', prior)).toEqual({
      scoreIsRecord: true, wordIsRecord: true,
    });
  });

  it('reads longestEver even when the high-score entry word is shorter', () => {
    const prior = history({
      allTimeBest: { ...entry, longestWord: 'cat' },
      longestEver: 'wonderful',
    });
    expect(evaluateRoundRecords(200, 'planets', prior).wordIsRecord).toBe(false);
    expect(evaluateRoundRecords(200, 'wonderfully', prior).wordIsRecord).toBe(true);
  });
});
