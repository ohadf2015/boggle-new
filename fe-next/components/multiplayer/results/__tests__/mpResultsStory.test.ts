import { describe, it, expect } from 'vitest';
import { roundAwards, seriesGrid } from '../mpResultsStory';
import type { MpStandingRow } from '../mpStandings';

const w = (word: string, score: number, extra: { validated?: boolean; isDuplicate?: boolean } = {}) => ({
  word,
  score,
  validated: extra.validated ?? true,
  isDuplicate: extra.isDuplicate ?? false,
});

describe('roundAwards (the round told as three awards)', () => {
  it('Given a played round, Then top word, longest word and most words each name their owner', () => {
    // Given the server's order with everyone's words
    const scores = [
      { username: 'Maya', allWords: [w('gult', 23), w('ra', 5)] },
      { username: 'Leo', allWords: [w('quartz', 18), w('tez', 4), w('rah', 4)] },
      { username: 'Kai', allWords: [] },
    ];
    // When the awards are picked
    const a = roundAwards(scores);
    // Then each award goes to the right player with the right value
    expect(a.best).toMatchObject({ username: 'Maya', word: 'gult', value: 23 });
    expect(a.longest).toMatchObject({ username: 'Leo', word: 'quartz', value: 6 });
    expect(a.most).toMatchObject({ username: 'Leo', value: 3 });
  });

  it('ignores rejected and duplicate words; a tie goes to the higher-ranked player (server order)', () => {
    const scores = [
      { username: 'Top', allWords: [w('cat', 3), w('zebras', 40, { validated: false })] },
      { username: 'Next', allWords: [w('dog', 3), w('elephant', 30, { isDuplicate: true })] },
    ];
    const a = roundAwards(scores);
    expect(a.best).toMatchObject({ username: 'Top', word: 'cat' });
    expect(a.most).toMatchObject({ username: 'Top', value: 1 });
  });

  it('never stamps the same word twice: when the longest word IS the top word, there is no longest stamp', () => {
    const a = roundAwards([
      { username: 'Host', allWords: [w('meld', 23), w('ra', 5)] },
      { username: 'Joe', allWords: [w('idl', 20)] },
    ]);
    expect(a.best).toMatchObject({ username: 'Host', word: 'meld' });
    expect(a.longest).toBeNull();
  });

  it('longest-word tie: the higher-scoring word wins', () => {
    const a = roundAwards([
      { username: 'A', allWords: [w('rake', 4)] },
      { username: 'B', allWords: [w('quiz', 22)] },
      { username: 'C', allWords: [w('ox', 30)] },
    ]);
    expect(a.longest).toMatchObject({ username: 'B', word: 'quiz' });
  });

  it('nobody counted a word: no awards at all (never a 0-word "most words")', () => {
    expect(roundAwards([{ username: 'A', allWords: [] }, { username: 'B' }])).toEqual({ best: null, longest: null, most: null });
  });
});

const ladderRow = (username: string, score: number, roundScore: number, isMe = false): MpStandingRow => ({
  username, rank: 1, score, roundScore, isMe, seriesTotal: score, seriesDelta: 0, bestWord: null,
});

describe('seriesGrid (the series told round by round)', () => {
  it('each row = earlier rounds from the tracker + the live round score, and sums to the total on the board', () => {
    // Given the final series ladder (live round 3 score in roundScore) and a
    // tracker that holds a pre-validation copy of round 3
    const ladder = [ladderRow('Maya', 70, 10), ladderRow('Leo', 38, 20, true)];
    const standings = [
      { username: 'Maya', totalScore: 62, roundScores: [40, 20, 2], rankChange: 0 },
      { username: 'Leo', totalScore: 18, roundScores: [15, 3, 0], rankChange: 0 },
    ];
    // When the grid is built for 3 rounds
    const g = seriesGrid({ ladder, standings, rounds: 3 });
    // Then the cells are the tracker's earlier rounds + the server's live round score
    expect(g?.rows.map((r) => r.cells)).toEqual([[40, 20, 10], [15, 3, 20]]);
    // And every row sums to the number the board shows
    for (const r of g!.rows) expect(r.cells.reduce((s, n) => s + n, 0)).toBe(r.total);
    // And each round's top score is marked (0-point rounds crown nobody)
    expect(g?.top).toEqual([40, 20, 20]);
    expect(g?.rows[1].isMe).toBe(true);
  });

  it('a late joiner missing from the tracker gets 0 for the rounds it missed', () => {
    const g = seriesGrid({
      ladder: [ladderRow('New', 12, 12)],
      standings: [],
      rounds: 3,
    });
    expect(g?.rows[0].cells).toEqual([0, 0, 12]);
  });

  it('marks no top in a round nobody scored', () => {
    const g = seriesGrid({
      ladder: [ladderRow('A', 5, 0), ladderRow('B', 0, 0)],
      standings: [
        { username: 'A', totalScore: 5, roundScores: [5, 0], rankChange: 0 },
        { username: 'B', totalScore: 0, roundScores: [0, 0], rankChange: 0 },
      ],
      rounds: 2,
    });
    expect(g?.top).toEqual([5, null]);
  });

  it('is null before there is a series to tell (round 1 / no ladder)', () => {
    expect(seriesGrid({ ladder: null, standings: [], rounds: 5 })).toBeNull();
    expect(seriesGrid({ ladder: [ladderRow('A', 5, 5)], standings: [], rounds: 1 })).toBeNull();
  });
});
