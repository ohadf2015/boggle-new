/**
 * Two presentation facts the classroom summary was missing.
 *
 * 1. A PODIUM. The room just played a game; the first thing on the screen has
 *    to be who won, with names and scores, not a coverage table.
 * 2. WHICH MISSES ARE REAL. The board generator embeds as many lesson words as
 *    it can fit — a measured 6x6 carried 1 of 9. A word that was never on the
 *    board is not a word the class failed; listing the two together tells the
 *    teacher to reteach vocabulary the students were never shown.
 *
 * Both derivations are pure and live here so they can be tested without
 * standing up a game, and so `gameScores.ts` grows by three lines.
 */

import { describe, it, expect } from 'vitest';
import { buildClassroomPodium, splitNeverPlacedWords } from '../classroomResultsExtras';

describe('buildClassroomPodium', () => {
  const mastery = {
    Maya: { found: 3, total: 4 },
    Noa: { found: 2, total: 4 },
    Eitan: { found: 1, total: 4 },
    Dana: { found: 0, total: 4 },
  };

  it('takes the top three human players with names and scores', () => {
    const podium = buildClassroomPodium({
      players: [
        { username: 'Maya', totalScore: 90 },
        { username: 'Noa', totalScore: 70 },
        { username: 'Eitan', totalScore: 50 },
        { username: 'Dana', totalScore: 10 },
      ],
      masteryByPlayer: mastery,
    });

    expect(podium).toEqual([
      { username: 'Maya', score: 90, rank: 1, wordsFound: 3, totalWords: 4 },
      { username: 'Noa', score: 70, rank: 2, wordsFound: 2, totalWords: 4 },
      { username: 'Eitan', score: 50, rank: 3, wordsFound: 1, totalWords: 4 },
    ]);
  });

  it('never puts a bot on a classroom podium', () => {
    const podium = buildClassroomPodium({
      players: [
        { username: 'RoboRex', totalScore: 999, isBot: true },
        { username: 'Maya', totalScore: 90 },
      ],
      masteryByPlayer: mastery,
    });
    expect(podium.map((p) => p.username)).toEqual(['Maya']);
  });

  it('returns an empty podium for a room with no humans, so the card can hide it', () => {
    expect(
      buildClassroomPodium({
        players: [{ username: 'RoboRex', totalScore: 999, isBot: true }],
        masteryByPlayer: {},
      })
    ).toEqual([]);
  });

  it('omits mastery counts for a player with no mastery row rather than reporting zero found', () => {
    const podium = buildClassroomPodium({
      players: [{ username: 'LateJoiner', totalScore: 5 }],
      masteryByPlayer: {},
    });
    expect(podium[0]).toEqual({ username: 'LateJoiner', score: 5, rank: 1 });
  });
});

describe('splitNeverPlacedWords', () => {
  it('separates lesson words the generator never put on the board', () => {
    expect(
      splitNeverPlacedWords({
        missedWords: ['neutron', 'quark'],
        placedWords: ['photon', 'neutron'],
        language: 'en',
      })
    ).toEqual(['quark']);
  });

  it('normalizes both sides so a Hebrew final letter is not reported as never placed', () => {
    // The board records the normalized trace (ם collapses to מ); the lesson
    // holds the natural spelling. A raw compare buckets this word wrongly.
    const missed = ['חלום'];
    const placed = ['חלומ'];
    expect(splitNeverPlacedWords({ missedWords: missed, placedWords: placed, language: 'he' })).toEqual([]);
  });

  it('reports nothing when the board carried every missed word', () => {
    expect(
      splitNeverPlacedWords({
        missedWords: ['neutron'],
        placedWords: ['neutron', 'photon'],
        language: 'en',
      })
    ).toEqual([]);
  });

  it('reports nothing when the placed list is unknown, so results fall back to today behaviour', () => {
    expect(
      splitNeverPlacedWords({ missedWords: ['neutron'], placedWords: undefined, language: 'en' })
    ).toEqual([]);
    expect(splitNeverPlacedWords({ missedWords: ['neutron'], placedWords: [], language: 'en' })).toEqual([]);
  });
});
