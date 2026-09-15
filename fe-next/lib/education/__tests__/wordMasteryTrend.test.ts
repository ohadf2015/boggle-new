/**
 * Cross-session word mastery — the Pro signal.
 *
 * The free "Last class game" card answers "what did the class miss today".
 * This answers the question nothing in the product answers: *is this student
 * actually learning this word, or did they just win one round?* — which needs
 * more than one session, so every rule here is about refusing to claim a
 * verdict the evidence does not support.
 *
 * Two traps this pins down:
 *  1. A miss in a BOARD mode (word-hunt/classic) is not evidence. The board may
 *     never have contained the word. `classroomGamePersistence.ts` records
 *     `results.lessonWordsAsked` only when it genuinely knows what was asked
 *     ("Null for board modes → every lesson word stays attemptable"), so its
 *     absence must mean "no evidence", never "wrong".
 *  2. One session is one score re-skinned. A word needs >= 2 asked sessions
 *     before this file is willing to call it anything.
 */

import { describe, it, expect } from 'vitest';
import {
  buildClassMastery,
  type MasterySessionRow,
} from '@/lib/education/wordMasteryTrend';

/** A quiz-style row: we know what was asked, so found/missed is real evidence. */
function askedRow(
  studentId: string,
  startedAt: string,
  gameCode: string,
  asked: string[],
  found: string[]
): MasterySessionRow {
  return {
    studentId,
    startedAt,
    results: {
      gameCode,
      gameMode: 'vocab-quiz',
      lessonWordsAsked: asked,
      lessonWordsFound: found,
      lessonWordsMissed: asked.filter((w) => !found.includes(w)),
    },
  };
}

/** A board-mode row: no `lessonWordsAsked`, so a "miss" proves nothing. */
function boardRow(
  studentId: string,
  startedAt: string,
  gameCode: string,
  missed: string[]
): MasterySessionRow {
  return {
    studentId,
    startedAt,
    results: {
      gameCode,
      gameMode: 'word-hunt',
      lessonWordsFound: [],
      lessonWordsMissed: missed,
    },
  };
}

describe('buildClassMastery — evidence rules', () => {
  it('Given only board-mode misses, When building, Then the word is never called stuck', () => {
    // A word-hunt board may simply not contain "ephemeral". Calling that
    // "stuck" is the false-alarm machine the research warns about.
    const out = buildClassMastery([
      boardRow('s1', '2026-09-01T10:00:00Z', 'AAA111', ['ephemeral']),
      boardRow('s1', '2026-09-02T10:00:00Z', 'AAA222', ['ephemeral']),
    ]);

    const student = out.students.find((s) => s.studentId === 's1');
    expect(student?.stuckWords ?? []).toEqual([]);
    expect(out.classStuckWords).toEqual([]);
    expect(out.rowsSkipped).toBe(2);
  });

  it('Given a single asked session, When building, Then the verdict is insufficient, not stuck', () => {
    const out = buildClassMastery([
      askedRow('s1', '2026-09-01T10:00:00Z', 'AAA111', ['candid'], []),
    ]);

    const word = out.students[0]?.words.find((w) => w.word === 'candid');
    expect(word?.trend).toBe('insufficient');
    expect(out.students[0]?.stuckWords).toEqual([]);
  });

  it('Given missed then found across two sessions, When building, Then the word is improving', () => {
    const out = buildClassMastery([
      askedRow('s1', '2026-09-01T10:00:00Z', 'AAA111', ['lucid'], []),
      askedRow('s1', '2026-09-08T10:00:00Z', 'AAA222', ['lucid'], ['lucid']),
    ]);

    const word = out.students[0]?.words.find((w) => w.word === 'lucid');
    expect(word?.trend).toBe('improving');
    expect(word?.attempts).toBe(2);
    expect(word?.correct).toBe(1);
  });

  it('Given found then missed, When building, Then the word is stuck (recency decides)', () => {
    const out = buildClassMastery([
      askedRow('s1', '2026-09-01T10:00:00Z', 'AAA111', ['tacit'], ['tacit']),
      askedRow('s1', '2026-09-08T10:00:00Z', 'AAA222', ['tacit'], []),
    ]);

    const word = out.students[0]?.words.find((w) => w.word === 'tacit');
    expect(word?.trend).toBe('stuck');
    expect(out.students[0]?.stuckWords).toContain('tacit');
  });

  it('Given every asked session correct, When building, Then the word is mastered', () => {
    const out = buildClassMastery([
      askedRow('s1', '2026-09-01T10:00:00Z', 'AAA111', ['candid'], ['candid']),
      askedRow('s1', '2026-09-08T10:00:00Z', 'AAA222', ['candid'], ['candid']),
    ]);

    const word = out.students[0]?.words.find((w) => w.word === 'candid');
    expect(word?.trend).toBe('mastered');
    expect(out.students[0]?.masteredCount).toBe(1);
  });

  it('Given rows out of chronological order, When building, Then recency still uses started_at', () => {
    // Query order is not guaranteed; the verdict must not depend on it.
    const out = buildClassMastery([
      askedRow('s1', '2026-09-08T10:00:00Z', 'AAA222', ['lucid'], ['lucid']),
      askedRow('s1', '2026-09-01T10:00:00Z', 'AAA111', ['lucid'], []),
    ]);

    expect(out.students[0]?.words.find((w) => w.word === 'lucid')?.trend).toBe('improving');
  });
});

describe('buildClassMastery — identity and normalization', () => {
  it('Given two students in one game, When building, Then they are not merged', () => {
    // Same gameCode AND same started_at, different students — the real shape of
    // a classroom game. De-duplication must key on (gameCode, studentId).
    const out = buildClassMastery([
      askedRow('s1', '2026-09-01T10:00:00Z', 'DECKG1', ['tacit'], ['tacit']),
      askedRow('s2', '2026-09-01T10:00:00Z', 'DECKG1', ['tacit'], []),
    ]);

    expect(out.students).toHaveLength(2);
    expect(out.students.find((s) => s.studentId === 's1')?.words[0]?.correct).toBe(1);
    expect(out.students.find((s) => s.studentId === 's2')?.words[0]?.correct).toBe(0);
  });

  it('Given the same game replayed in the payload, When building, Then it counts once', () => {
    const dup = askedRow('s1', '2026-09-01T10:00:00Z', 'AAA111', ['tacit'], []);
    const out = buildClassMastery([dup, { ...dup }]);

    expect(out.students[0]?.words.find((w) => w.word === 'tacit')?.attempts).toBe(1);
  });

  it('Given mixed casing, When building, Then words fold to one key', () => {
    const out = buildClassMastery([
      askedRow('s1', '2026-09-01T10:00:00Z', 'AAA111', ['Lucid'], []),
      askedRow('s1', '2026-09-08T10:00:00Z', 'AAA222', ['LUCID'], ['lucid']),
    ]);

    const words = out.students[0]?.words ?? [];
    expect(words).toHaveLength(1);
    expect(words[0]?.word).toBe('lucid');
    expect(words[0]?.trend).toBe('improving');
  });
});

describe('buildClassMastery — malformed rows never throw', () => {
  it.each([
    ['null results', { studentId: 's1', startedAt: '2026-09-01T10:00:00Z', results: null }],
    ['string results', { studentId: 's1', startedAt: '2026-09-01T10:00:00Z', results: 'nope' }],
    ['asked not an array', {
      studentId: 's1',
      startedAt: '2026-09-01T10:00:00Z',
      results: { gameCode: 'A', lessonWordsAsked: 'lucid', lessonWordsFound: [] },
    }],
    ['non-string entries', {
      studentId: 's1',
      startedAt: '2026-09-01T10:00:00Z',
      results: { gameCode: 'A', lessonWordsAsked: [1, null], lessonWordsFound: [] },
    }],
    ['missing studentId', { studentId: '', startedAt: '2026-09-01T10:00:00Z', results: {} }],
    ['unparseable startedAt', {
      studentId: 's1',
      startedAt: 'not-a-date',
      results: { gameCode: 'A', lessonWordsAsked: ['lucid'], lessonWordsFound: [] },
    }],
  ])('Given %s, When building, Then the row is skipped and counted', (_label, row) => {
    // The blob is written by another handler that is actively being edited.
    // A shape change must degrade this feature, never crash a teacher's page.
    const out = buildClassMastery([row as MasterySessionRow]);

    expect(out.students).toEqual([]);
    expect(out.rowsSkipped).toBe(1);
  });
});

describe('buildClassMastery — class-level remediation list', () => {
  it('Given a word several students are stuck on, When building, Then it ranks first', () => {
    const rows: MasterySessionRow[] = [];
    // s1 and s2 are stuck on "ephemeral" across two sessions; only s1 on "tacit".
    for (const [i, code] of ['G1', 'G2'].entries()) {
      const day = `2026-09-0${i + 1}T10:00:00Z`;
      rows.push(askedRow('s1', day, code, ['ephemeral', 'tacit'], []));
      rows.push(askedRow('s2', day, code, ['ephemeral', 'tacit'], ['tacit']));
    }

    const out = buildClassMastery(rows);

    expect(out.classStuckWords[0]?.word).toBe('ephemeral');
    expect(out.classStuckWords[0]?.studentsStuck).toBe(2);
    expect(out.classStuckWords.map((w) => w.word)).not.toContain('candid');
  });

  it('Given a word only one student ever saw twice, When building, Then it still lists with a count of 1', () => {
    const out = buildClassMastery([
      askedRow('s1', '2026-09-01T10:00:00Z', 'G1', ['tacit'], []),
      askedRow('s1', '2026-09-02T10:00:00Z', 'G2', ['tacit'], []),
    ]);

    expect(out.classStuckWords).toEqual([
      expect.objectContaining({ word: 'tacit', studentsStuck: 1 }),
    ]);
  });

  it('Given no evidence at all, When building, Then it reports zero sessions rather than an empty verdict', () => {
    const out = buildClassMastery([]);

    expect(out.sessionsAnalyzed).toBe(0);
    expect(out.classStuckWords).toEqual([]);
    expect(out.students).toEqual([]);
  });
});
