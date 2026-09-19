import { describe, it, expect } from 'vitest';
import {
  readAssignmentMode,
  practiceFocusForMode,
  wordCraftPracticeHref,
  lessonWordsPlayed,
  sessionCompletesAssignment,
  WORDCRAFT_SESSION_MODE,
} from '../wordcraftAssignment';

/**
 * Word Craft as classroom homework. `lesson_assignments` has no mode column, so
 * the mode rides on `practice_focus`: 'wordcraft' = Word Craft, NULL/'any' =
 * student picks (unchanged legacy meaning), a vocab focus = that drill.
 */
describe('readAssignmentMode', () => {
  it('Given no assignment, When read, Then there is no mode', () => {
    expect(readAssignmentMode(null)).toBeNull();
    expect(readAssignmentMode(undefined)).toBeNull();
  });

  it("Given practice_focus 'wordcraft', When read, Then it is Word Craft", () => {
    expect(readAssignmentMode({ practice_focus: 'wordcraft' })).toBe('wordcraft');
  });

  it('Given a legacy/duel row with practice_focus NULL (or missing), When read, Then it is NOT Word Craft — the student picks', () => {
    expect(readAssignmentMode({ practice_focus: null })).toBe('any');
    expect(readAssignmentMode({})).toBe('any');
  });

  it("Given practice_focus 'any', When read, Then the student picks", () => {
    expect(readAssignmentMode({ practice_focus: 'any' })).toBe('any');
  });

  it('Given a vocab focus, When read, Then that focus is the mode', () => {
    expect(readAssignmentMode({ practice_focus: 'synonym' })).toBe('synonym');
  });

  it('Given an unknown focus value, When read, Then it degrades to student-picks', () => {
    expect(readAssignmentMode({ practice_focus: 'bogus' })).toBe('any');
  });
});

describe('practiceFocusForMode', () => {
  it("Word Craft is stored as 'wordcraft'; student-picks as NULL (legacy shape); a focus as itself", () => {
    expect(practiceFocusForMode('wordcraft')).toBe('wordcraft');
    expect(practiceFocusForMode('any')).toBeNull();
    expect(practiceFocusForMode('antonym')).toBe('antonym');
  });

  it('round-trips through readAssignmentMode', () => {
    for (const mode of ['wordcraft', 'any', 'definition'] as const) {
      expect(readAssignmentMode({ practice_focus: practiceFocusForMode(mode) })).toBe(mode);
    }
  });
});

describe('wordCraftPracticeHref', () => {
  it('deep-links the lesson page straight into the Word Craft variant', () => {
    expect(wordCraftPracticeHref('he', 'L1')).toBe('/he/student/lessons/L1?mode=solo_board&variant=wordcraft');
  });
});

describe('lessonWordsPlayed', () => {
  it('Given player and bot moves, When matched, Then only the player lesson words count, once each', () => {
    const history = [
      { who: 'player' as const, words: ['CAT', 'SUN'] },
      { who: 'bot' as const, words: ['DOG'] },
      { who: 'player' as const, words: ['cat'] },
    ];
    expect(lessonWordsPlayed(history, ['cat', 'dog', 'tree'], 'en')).toEqual(['CAT']);
  });

  it('Given a Hebrew lesson word with a final form, When played in base form, Then it still matches', () => {
    // שלום ends in final mem; the board may produce the base letter.
    const history = [{ who: 'player' as const, words: ['שלומ'] }];
    expect(lessonWordsPlayed(history, ['שלום'], 'he')).toHaveLength(1);
  });
});

describe('sessionCompletesAssignment', () => {
  it('a Word Craft assignment is completed only by a Word Craft session', () => {
    expect(sessionCompletesAssignment('wordcraft', { mode: WORDCRAFT_SESSION_MODE })).toBe(true);
    expect(sessionCompletesAssignment('wordcraft', { mode: null })).toBe(false);
  });

  it('a student-picks or focus assignment is completed by any finished session', () => {
    expect(sessionCompletesAssignment('any', { mode: null })).toBe(true);
    expect(sessionCompletesAssignment('synonym', { mode: 'vocab_focus' })).toBe(true);
  });
});
