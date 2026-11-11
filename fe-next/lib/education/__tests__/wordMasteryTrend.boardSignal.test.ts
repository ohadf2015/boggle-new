import { describe, it, expect } from 'vitest';
import { buildClassMastery, type MasterySessionRow } from '@/lib/education/wordMasteryTrend';
import { rankWeekHardestWords } from '@/lib/education/pro/freeClassInsight';
import { buildWordMasteryReport, FREE_PREVIEW_WORDS, toFreePreview } from '@/lib/education/wordMasteryReport';

const board = (studentId: string, startedAt: string, gameCode: string, found: string[], missed: string[]): MasterySessionRow => ({
  studentId,
  startedAt,
  results: { gameCode, lessonWordsFound: found, lessonWordsMissed: missed },
});

const asked = (studentId: string, startedAt: string, gameCode: string, words: string[], found: string[]): MasterySessionRow => ({
  studentId,
  startedAt,
  results: { gameCode, lessonWordsAsked: words, lessonWordsFound: found, lessonWordsMissed: words.filter((w) => !found.includes(w)) },
});

const WEEK: MasterySessionRow[] = [
  board('a', '2026-11-09T09:00:00Z', 'G1', ['cat'], ['owl', 'fox']),
  board('b', '2026-11-09T09:00:00Z', 'G1', ['owl'], ['cat', 'fox']),
  board('c', '2026-11-09T09:00:00Z', 'G1', [], ['cat', 'owl', 'fox']),
  board('a', '2026-11-10T09:00:00Z', 'G2', ['cat'], ['owl', 'fox']),
];

describe('buildClassMastery: board rounds as a separate not-found signal', () => {
  it('Given only board rounds, Then no verdicts are drawn but the not-found words are returned', () => {
    const m = buildClassMastery(WEEK);
    expect(m.students).toEqual([]);
    expect(m.classStuckWords).toEqual([]);
    expect(m.sessionsAnalyzed).toBe(0);
    expect(m.notFoundInGames?.sessions).toBe(4);
    expect(m.notFoundInGames?.words.map((w) => w.word)).toEqual(['fox', 'owl', 'cat']);
  });

  it('Given asked rounds, Then their misses stay in the verdicts and never in the not-found signal', () => {
    const m = buildClassMastery([
      asked('a', '2026-11-09T09:00:00Z', 'Q1', ['moon'], []),
      asked('a', '2026-11-10T09:00:00Z', 'Q2', ['moon'], []),
      board('a', '2026-11-10T10:00:00Z', 'B1', [], ['sun']),
      board('b', '2026-11-10T10:00:00Z', 'B1', [], ['sun']),
    ]);
    expect(m.classStuckWords.map((w) => w.word)).toEqual(['moon']);
    expect(m.notFoundInGames?.words.map((w) => w.word)).toEqual(['sun']);
    expect(m.notFoundInGames?.sessions).toBe(2);
  });

  it('Given a rematch that reuses the room code, Then each round counts once', () => {
    const m = buildClassMastery([
      board('a', '2026-11-09T09:00:00Z', 'R', [], ['owl']),
      board('a', '2026-11-09T09:10:00Z', 'R', [], ['owl']),
      board('a', '2026-11-09T09:10:00Z', 'R', [], ['owl']),
    ]);
    expect(m.notFoundInGames?.sessions).toBe(2);
    expect(m.notFoundInGames?.words[0]).toMatchObject({ word: 'owl', attempts: 2, missed: 2 });
  });

  it('Given the same board-only week, Then Pro shows every word the free weekly insight shows', () => {
    const free = rankWeekHardestWords(WEEK.map((r) => ({ studentId: r.studentId, startedAt: r.startedAt, results: r.results })), FREE_PREVIEW_WORDS);
    const pro = buildWordMasteryReport(buildClassMastery(WEEK));
    expect(free.hardestWords.length).toBeGreaterThan(0);
    const proWords = new Set(pro.notFoundInGames?.words.map((w) => w.word));
    for (const w of free.hardestWords) expect(proWords.has(w.word)).toBe(true);
    expect(pro.notFoundInGames?.sessions).toBe(free.sessions);
  });

  it('Given a free teacher, Then the locked preview carries the not-found words cut to the free size', () => {
    const many = ['a', 'b'].map((s) => board(s, '2026-11-09T09:00:00Z', 'G', [], ['w1', 'w2', 'w3', 'w4', 'w5']));
    const preview = toFreePreview(buildWordMasteryReport(buildClassMastery(many)));
    expect(preview.notFoundInGames?.words).toHaveLength(FREE_PREVIEW_WORDS);
    expect(preview.notFoundInGames?.sessions).toBe(2);
  });
});
