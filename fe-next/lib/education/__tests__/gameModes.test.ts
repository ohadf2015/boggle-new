/**
 * The teacher-facing mode catalog.
 *
 * Blooket's picker is a wall of logos: you tap a poster, read a spec panel on
 * the right, then tap Host. Three actions before a class plays anything, and
 * nothing on the poster itself tells you what the mode DOES or how long it
 * takes. This catalog is the data behind a picker that answers both on the tile
 * — name, one-line "how it plays", a minute count — and that marks the one mode
 * the teacher's own words are actually suited to.
 *
 * It is pure data + one predicate on purpose: the recommendation has to be
 * testable without a DOM, and it has to agree with the express launcher's
 * `pickQuickLaunchMode`. Two tables disagreeing about "which mode fits these
 * words" is recurring pitfall class 3 (two paths, one outcome, silent drift).
 */

import { describe, it, expect } from 'vitest';
import {
  TEACHER_GAME_MODES,
  teacherGameMode,
  recommendedModeForWords,
  recommendedModeBadge,
  definedWordCount,
  modeDurationMinutes,
  configuredRoundMinutes,
} from '../gameModes';
import { CLASSROOM_GAME_MODES, VOCAB_QUIZ_MODE } from '@/shared/types/vocabQuiz';
import { pickQuickLaunchMode } from '@/components/teacher/dashboard/quickLaunchIntent';

describe('TEACHER_GAME_MODES — one poster per playable classroom mode', () => {
  it('covers exactly the modes a teacher may pick, in wizard order', () => {
    expect(TEACHER_GAME_MODES.map((m) => m.id)).toEqual([...CLASSROOM_GAME_MODES]);
  });

  it('gives every mode a poster, a name key, a how-it-plays line and a duration', () => {
    for (const mode of TEACHER_GAME_MODES) {
      expect(mode.poster, `${mode.id} has no poster`).toMatch(/^\/mascot\/teacher\/mode-.+\.webp$/);
      expect(mode.nameKey).toBe(`teacher.classroom.gameModes.${mode.nameKeySuffix}`);
      expect(mode.howKey).toBe(`education.modePicker.how.${mode.nameKeySuffix}`);
      expect(mode.minutes).toBeGreaterThan(0);
    }
  });

  it('never paints a mode in a reserved accent (yellow = celebration, orange = streak)', () => {
    for (const mode of TEACHER_GAME_MODES) {
      expect(['cyan', 'lime', 'pink', 'purple']).toContain(mode.accent);
    }
  });

  it('resolves a mode by id and falls back rather than returning undefined', () => {
    expect(teacherGameMode('blast')?.id).toBe('blast');
    // A room created before a mode was retired must still render a tile.
    expect(teacherGameMode('word-tower')).toBeUndefined();
  });

  it('reads a duration for a known mode and a sane default for an unknown one', () => {
    expect(modeDurationMinutes(VOCAB_QUIZ_MODE)).toBe(
      TEACHER_GAME_MODES.find((m) => m.id === VOCAB_QUIZ_MODE)!.minutes
    );
    expect(modeDurationMinutes('word-tower')).toBeGreaterThan(0);
  });
});

describe('recommendedModeForWords — "recommended for this lesson"', () => {
  const defined = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ word: `w${i}`, definition: 'a meaning' }));
  const bare = (n: number) => Array.from({ length: n }, (_, i) => ({ word: `w${i}` }));

  it('counts only words that actually carry a definition', () => {
    expect(definedWordCount([...defined(3), ...bare(5)])).toBe(3);
    expect(definedWordCount([{ word: 'x', definition: '   ' }])).toBe(0);
    expect(definedWordCount(undefined)).toBe(0);
  });

  it('recommends the quiz once the words carry enough definitions', () => {
    expect(recommendedModeForWords(defined(4))).toBe(VOCAB_QUIZ_MODE);
  });

  it('recommends classic when the words are just words', () => {
    expect(recommendedModeForWords(bare(20))).toBe('classic');
    expect(recommendedModeForWords(defined(3))).toBe('classic');
  });

  it('recommends classic when there is no lesson attached at all', () => {
    expect(recommendedModeForWords([])).toBe('classic');
    expect(recommendedModeForWords(undefined)).toBe('classic');
  });

  it('badges the quiz only when a quiz is genuinely buildable, never a board mode', () => {
    // The lobby preselects the quiz the moment a lesson is attached. A badge
    // pointing at Classic for a definition-less list would argue with that
    // preselection on the same screen, so there is simply no badge.
    expect(recommendedModeBadge(defined(4))).toBe(VOCAB_QUIZ_MODE);
    expect(recommendedModeBadge(defined(3))).toBeNull();
    expect(recommendedModeBadge(bare(30))).toBeNull();
    expect(recommendedModeBadge([])).toBeNull();
    expect(recommendedModeBadge(undefined)).toBeNull();
  });

  it('agrees with the express launcher, so GO LIVE and the lobby never disagree', () => {
    for (const words of [defined(4), defined(3), bare(9), []]) {
      expect(recommendedModeForWords(words)).toBe(pickQuickLaunchMode(words));
    }
  });
});

/**
 * The minute chip on the poster and the minute chip in the round settings are
 * the SAME fact. Measured live 2026-09-11 they disagreed — the poster promised
 * "5 MIN" from the catalog and the lobby two taps later said "3 min" from the
 * timer the teacher had set — which is recurring pitfall class 3 (one fact,
 * two sources) and reads to a teacher as a lie on the poster.
 */
describe('configuredRoundMinutes — the poster quotes the room, not the catalog', () => {
  it('quotes the timer the teacher set, for every board mode', () => {
    for (const mode of ['classic', 'word-hunt', 'blast', 'wheel-rush'] as const) {
      expect(configuredRoundMinutes(mode, { timerMinutes: 7 })).toBe(7);
      expect(configuredRoundMinutes(mode, { timerMinutes: 2 })).toBe(2);
    }
  });

  it('derives the quiz length from its own two settings, never the board timer', () => {
    // 10 questions x 20s = 200s -> 3 min, whatever the board timer says.
    expect(
      configuredRoundMinutes(VOCAB_QUIZ_MODE, {
        timerMinutes: 9,
        vocabQuizQuestionCount: 10,
        vocabQuizSeconds: 20,
      })
    ).toBe(3);
    expect(
      configuredRoundMinutes(VOCAB_QUIZ_MODE, {
        timerMinutes: 9,
        vocabQuizQuestionCount: 20,
        vocabQuizSeconds: 30,
      })
    ).toBe(10);
  });

  /** A chip reading "0 min" is worse than a rough one. */
  it('never quotes less than a minute', () => {
    expect(
      configuredRoundMinutes(VOCAB_QUIZ_MODE, { vocabQuizQuestionCount: 1, vocabQuizSeconds: 5 })
    ).toBe(1);
    expect(configuredRoundMinutes('classic', { timerMinutes: 0 })).toBe(1);
  });

  it('falls back to the catalog when the room is not configured yet', () => {
    expect(configuredRoundMinutes('blast', {})).toBe(modeDurationMinutes('blast'));
    expect(configuredRoundMinutes(VOCAB_QUIZ_MODE, {})).toBe(modeDurationMinutes(VOCAB_QUIZ_MODE));
  });
});
