import { describe, expect, it } from 'vitest';
import { EDU_MAX_ROUND_SEC } from '@/shared/constants/lessonScoring';
import { classroomRoundSeconds } from '@/shared/utils/fixedRoundTimer';
import { capQuizToRound, VOCAB_QUIZ_REVEAL_MS, VOCAB_QUIZ_DEFAULT_QUESTION_COUNT, VOCAB_QUIZ_DEFAULT_SECONDS } from '@/shared/types/vocabQuiz';
import { TEACHER_GAME_MODES, FALLBACK_MODE_MINUTES, configuredRoundMinutes } from '@/lib/education/gameModes';
import { CLASSROOM_PRESETS } from '@/lib/education/classroomPresets';
import { HOST_TIMER_MINUTES } from '@/lib/education/teacherHostHref';
import { SESSION_TEMPLATES } from '@/lib/education/sessionTemplates';
import { CLASS_GAP_RETEACH_TIMER_SECONDS } from '@/lib/education/classGapShare';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import { classroomHostPreset } from '@/lib/education/classroomHostPreset';
import { TIMER_MINUTES } from '@/components/education/lobby/LobbyRoundSettings';
import { QUIZ_QUESTION_COUNTS, QUIZ_SECONDS_CHOICES } from '@/components/education/vocabQuiz/VocabQuizFocusPicker';
import { getGameModeRules } from '@/backend/modes/rules';

const MAX_MIN = EDU_MAX_ROUND_SEC / 60;
const quizSec = (count: number, seconds: number) => count * (seconds + VOCAB_QUIZ_REVEAL_MS / 1000);

describe('every classroom game lasts at most 2 minutes', () => {
  it('caps the shared constant at 120s', () => {
    expect(EDU_MAX_ROUND_SEC).toBe(120);
  });

  it('keeps every mode tile, fallback and fixed classroom round within the cap', () => {
    for (const mode of TEACHER_GAME_MODES) expect(mode.minutes, mode.id).toBeLessThanOrEqual(MAX_MIN);
    expect(FALLBACK_MODE_MINUTES).toBeLessThanOrEqual(MAX_MIN);
    expect(classroomRoundSeconds('crossword')).toBe(EDU_MAX_ROUND_SEC);
    expect(configuredRoundMinutes('crossword', {})).toBeLessThanOrEqual(MAX_MIN);
    expect(configuredRoundMinutes('classic', { timerMinutes: 5 })).toBeLessThanOrEqual(MAX_MIN);
  });

  it('offers no timer choice, preset or session longer than the cap', () => {
    for (const m of [...TIMER_MINUTES, ...HOST_TIMER_MINUTES]) expect(m).toBeLessThanOrEqual(MAX_MIN);
    for (const [id, preset] of Object.entries(CLASSROOM_PRESETS)) expect(preset.timerMinutes, id).toBeLessThanOrEqual(MAX_MIN);
    for (const s of SESSION_TEMPLATES) {
      expect(s.timerMinutes, s.id).toBeLessThanOrEqual(MAX_MIN);
      if (s.quiz) expect(quizSec(s.quiz.questionCount, s.quiz.seconds), s.id).toBeLessThanOrEqual(EDU_MAX_ROUND_SEC);
    }
  });

  it('keeps quiz chips, defaults and stale combos within the cap', () => {
    for (const count of QUIZ_QUESTION_COUNTS) {
      expect(QUIZ_SECONDS_CHOICES.some((s) => quizSec(count, s) <= EDU_MAX_ROUND_SEC), `count ${count}`).toBe(true);
    }
    for (const s of QUIZ_SECONDS_CHOICES) {
      expect(QUIZ_QUESTION_COUNTS.some((c) => quizSec(c, s) <= EDU_MAX_ROUND_SEC), `seconds ${s}`).toBe(true);
    }
    const stale = capQuizToRound(20, 30);
    expect(quizSec(stale.questionCount, stale.secondsPerQuestion)).toBeLessThanOrEqual(EDU_MAX_ROUND_SEC);
    expect([VOCAB_QUIZ_DEFAULT_QUESTION_COUNT, VOCAB_QUIZ_DEFAULT_SECONDS]).toEqual([6, 15]);
    expect(capQuizToRound(6, 15)).toEqual({ questionCount: 6, secondsPerQuestion: 15 });
    expect(capQuizToRound(8, 15).questionCount).toBe(6);
    expect(configuredRoundMinutes('vocab-quiz', { vocabQuizQuestionCount: 6, vocabQuizSeconds: 15 })).toBeLessThanOrEqual(MAX_MIN);
  });

  it('caps stored and built-in timers read for play', () => {
    expect(getGameModeRules('wordcraft').defaultTimerSec).toBeLessThanOrEqual(EDU_MAX_ROUND_SEC);
    expect(CLASS_GAP_RETEACH_TIMER_SECONDS).toBeLessThanOrEqual(EDU_MAX_ROUND_SEC);
    for (const pack of STARTER_LESSON_PACKS) expect(pack.settings.timeLimit, pack.nameKey).toBeLessThanOrEqual(EDU_MAX_ROUND_SEC);
    expect(classroomHostPreset({ timerSeconds: 300, difficulty: 'medium' })?.timerMinutes).toBe(MAX_MIN);
  });
});
