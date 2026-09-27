import { describe, expect, it } from 'vitest';
import { FAST_SOLVE_MS } from './score';
import {
  deriveAttemptsFromSessions,
  type GameSessionWordRow,
} from './deriveFromSessions';

describe('deriveAttemptsFromSessions', () => {
  it('shouldTreatFoundWordsAsSolvedAttempts', () => {
    // GIVEN
    const sessions: GameSessionWordRow[] = [
      {
        words_found: ['CAT', 'DOG'],
        clues_used: 0,
        duration_seconds: 60,
        language: 'en',
        completed: true,
      },
    ];

    // WHEN
    const byWord = deriveAttemptsFromSessions(sessions);

    // THEN
    expect(byWord.get('cat')?.attempts).toHaveLength(1);
    expect(byWord.get('dog')?.attempts[0]?.outcome).toBe('solved');
    expect(byWord.get('cat')?.language).toBe('en');
  });

  it('shouldMarkAttemptsHintedWhenSessionUsedClues', () => {
    // GIVEN
    const sessions: GameSessionWordRow[] = [
      {
        words_found: ['TREE'],
        clues_used: 2,
        duration_seconds: 40,
        language: 'en',
        completed: true,
      },
    ];

    // WHEN
    const byWord = deriveAttemptsFromSessions(sessions);

    // THEN
    expect(byWord.get('tree')?.attempts[0]?.usedHint).toBe(true);
  });

  it('shouldSplitSessionDurationAcrossFoundWords', () => {
    // GIVEN — 16s session, two words → 8s each (the fast bar)
    const sessions: GameSessionWordRow[] = [
      {
        words_found: ['FAST', 'PACE'],
        clues_used: 0,
        duration_seconds: 16,
        language: 'en',
        completed: true,
      },
    ];

    // WHEN
    const byWord = deriveAttemptsFromSessions(sessions);

    // THEN
    expect(byWord.get('fast')?.attempts[0]?.durationMs).toBe(8_000);
    expect(byWord.get('fast')?.attempts[0]?.durationMs).toBe(FAST_SOLVE_MS);
  });

  it('shouldIgnoreEmptyOrIncompleteSessions', () => {
    // GIVEN
    const sessions: GameSessionWordRow[] = [
      {
        words_found: [],
        clues_used: 0,
        duration_seconds: 30,
        language: 'en',
        completed: true,
      },
      {
        words_found: ['SKIP'],
        clues_used: 0,
        duration_seconds: 30,
        language: 'en',
        completed: false,
      },
      {
        words_found: null,
        clues_used: 0,
        duration_seconds: 30,
        language: 'en',
        completed: true,
      },
    ];

    // WHEN
    const byWord = deriveAttemptsFromSessions(sessions);

    // THEN
    expect(byWord.size).toBe(0);
  });

  it('shouldAccumulateAttemptsAcrossSessionsForTheSameWord', () => {
    // GIVEN
    const sessions: GameSessionWordRow[] = [
      {
        words_found: ['ECHO'],
        clues_used: 1,
        duration_seconds: 20,
        language: 'en',
        completed: true,
      },
      {
        words_found: ['echo'],
        clues_used: 0,
        duration_seconds: 6,
        language: 'en',
        completed: true,
      },
    ];

    // WHEN
    const byWord = deriveAttemptsFromSessions(sessions);

    // THEN
    expect(byWord.get('echo')?.attempts).toHaveLength(2);
    expect(byWord.get('echo')?.attempts[0]?.usedHint).toBe(true);
    expect(byWord.get('echo')?.attempts[1]?.usedHint).toBe(false);
  });

  it('shouldParseJsonStringWordsFound', () => {
    // GIVEN — some rows store JSONB as a serialized string
    const sessions: GameSessionWordRow[] = [
      {
        words_found: JSON.stringify(['MOON']),
        clues_used: 0,
        duration_seconds: 5,
        language: 'he',
        completed: true,
      },
    ];

    // WHEN
    const byWord = deriveAttemptsFromSessions(sessions);

    // THEN
    expect(byWord.get('moon')?.language).toBe('he');
    expect(byWord.get('moon')?.attempts[0]?.outcome).toBe('solved');
  });
});
