import { describe, it, expect } from 'vitest';
import { buildClassMastery, type MasterySessionRow } from '@/lib/education/wordMasteryTrend';
import { buildClassInsights, CLASS_GOAL } from '../classInsights';

function row(studentId: string, startedAt: string, asked: string[], found: string[]): MasterySessionRow {
  return {
    studentId,
    startedAt,
    results: { gameCode: 'ROOM1', gameMode: 'vocab-quiz', lessonWordsAsked: asked, lessonWordsFound: found },
  };
}

const R1 = '2026-09-01T10:00:00Z';
const R2 = '2026-09-01T10:05:00Z';
const R3 = '2026-09-02T10:00:00Z';

describe('buildClassInsights — students', () => {
  it('Given mixed accuracy, When building, Then students come weakest first with the goal flag', () => {
    const insights = buildClassInsights(
      buildClassMastery([
        row('strong', R1, ['castle', 'bridge'], ['castle', 'bridge']),
        row('weak', R1, ['castle', 'bridge'], []),
      ]),
    );

    expect(insights.goal).toBe(CLASS_GOAL);
    expect(insights.students.map((s) => s.studentId)).toEqual(['weak', 'strong']);
    expect(insights.students[0]).toMatchObject({ accuracy: 0, belowGoal: true });
    expect(insights.students[1]).toMatchObject({ accuracy: 100, belowGoal: false });
    expect(insights.belowGoalCount).toBe(1);
  });

  it('Given a student who missed words, When building, Then their most-missed words lead, capped at three', () => {
    const insights = buildClassInsights(
      buildClassMastery([
        row('s1', R1, ['castle', 'bridge', 'eagle', 'dragon', 'silver'], ['silver']),
        row('s1', R2, ['castle', 'bridge'], ['bridge']),
      ]),
    );

    const s1 = insights.students[0];
    expect(s1.missedWords[0]).toBe('castle');
    expect(s1.missedWords).toHaveLength(3);
    expect(s1.missedWords).not.toContain('silver');
  });

  it('Given later rounds beat earlier ones, When building, Then the trend is up', () => {
    const insights = buildClassInsights(
      buildClassMastery([
        row('s1', R1, ['castle', 'bridge', 'eagle'], []),
        row('s1', R2, ['castle', 'bridge', 'eagle'], ['castle', 'bridge', 'eagle']),
      ]),
    );
    expect(insights.students[0].trend).toBe('up');
  });

  it('Given later rounds fall behind, When building, Then the trend is down', () => {
    const insights = buildClassInsights(
      buildClassMastery([
        row('s1', R1, ['castle', 'bridge'], ['castle', 'bridge']),
        row('s1', R3, ['castle', 'bridge'], []),
      ]),
    );
    expect(insights.students[0].trend).toBe('down');
  });

  it('Given a single round, When building, Then the trend is new — one score is not a direction', () => {
    const insights = buildClassInsights(buildClassMastery([row('s1', R1, ['castle'], [])]));
    expect(insights.students[0].trend).toBe('new');
  });
});

describe('buildClassInsights — words', () => {
  it('Given every student got a word twice, When building, Then the word is mastered', () => {
    const insights = buildClassInsights(
      buildClassMastery([
        row('a', R1, ['castle'], ['castle']),
        row('a', R2, ['castle'], ['castle']),
        row('b', R1, ['castle'], ['castle']),
        row('b', R2, ['castle'], ['castle']),
      ]),
    );
    expect(insights.words.castle).toMatchObject({ state: 'mastered', studentsMastered: 2, studentsWithEvidence: 2 });
    expect(insights.masteredWords).toBe(1);
  });

  it('Given half the class still misses a word, When building, Then the word is stuck', () => {
    const insights = buildClassInsights(
      buildClassMastery([
        row('a', R1, ['bridge'], []),
        row('a', R2, ['bridge'], []),
        row('b', R1, ['bridge'], []),
        row('b', R2, ['bridge'], ['bridge']),
      ]),
    );
    expect(insights.words.bridge).toMatchObject({ state: 'stuck', studentsStuck: 1 });
    expect(insights.stuckWords).toBe(1);
  });

  it('Given a minority still stuck, When building, Then the word is improving', () => {
    const insights = buildClassInsights(
      buildClassMastery([
        row('a', R1, ['eagle'], []),
        row('a', R2, ['eagle'], []),
        row('b', R1, ['eagle'], []),
        row('b', R2, ['eagle'], ['eagle']),
        row('c', R1, ['eagle'], ['eagle']),
        row('c', R2, ['eagle'], ['eagle']),
      ]),
    );
    expect(insights.words.eagle.state).toBe('improving');
  });

  it('Given a word asked only once per student, When building, Then its state is new', () => {
    const insights = buildClassInsights(buildClassMastery([row('a', R1, ['dragon'], [])]));
    expect(insights.words.dragon).toMatchObject({ state: 'new', studentsWithEvidence: 0 });
  });

  it('Given no evidence at all, When building, Then it returns empty insights without throwing', () => {
    const insights = buildClassInsights(buildClassMastery([]));
    expect(insights).toMatchObject({ students: [], words: {}, belowGoalCount: 0, masteredWords: 0, stuckWords: 0 });
  });
});
