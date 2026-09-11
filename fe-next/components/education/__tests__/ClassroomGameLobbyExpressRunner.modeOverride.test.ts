/**
 * GO LIVE stays one tap — and a second tap can change the game.
 *
 * The express path picks a mode from the words and never asks. That is the
 * whole point for the teacher who does not care. The teacher who DOES care had
 * no way in at all: the mode was decided inside the runner and the room was on
 * the wire before the screen finished painting.
 *
 * `modeOverride` is that way in. Absent, nothing changes — the derived mode
 * still wins, so the default one-tap launch is untouched.
 */
import { describe, it, expect, vi } from 'vitest';
import { prepareQuickLaunch, type QuickLaunchDeps } from '../ClassroomGameLobbyExpressRunner';
import type { QuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';
import { VOCAB_QUIZ_MODE } from '@/shared/types/vocabQuiz';

const CLASSROOM = { id: 'c-1', name: 'My Class', language: 'en' } as never;

/** Words WITH definitions — the derived mode for these is the quiz. */
const LESSON = {
  id: 'l-1',
  name: 'Unit 4',
  language: 'en',
  words: Array.from({ length: 6 }, (_, i) => ({ word: `word${i}`, definition: `def${i}` })),
} as never;

function deps(over: Partial<QuickLaunchDeps> = {}): QuickLaunchDeps {
  return {
    userId: 'u-1',
    teacherName: 'Ms Cohen',
    gameCode: 'ABC234',
    defaultClassName: 'My Class',
    uiLanguage: 'en',
    listClassrooms: vi.fn(async () => [CLASSROOM]),
    createClassroom: vi.fn(async () => ({ success: true, data: CLASSROOM })),
    getLessonById: vi.fn(async () => LESSON),
    createLesson: vi.fn(async () => ({ data: LESSON, error: null })),
    onStage: vi.fn(),
    ...over,
  } as QuickLaunchDeps;
}

const intent: QuickLaunchIntent = {
  source: 'lesson', lessonId: 'l-1', title: 'Unit 4', language: 'en', createdAt: Date.now(),
};

describe('prepareQuickLaunch — the teacher may override the derived mode', () => {
  it('still derives the mode when nothing is overridden', async () => {
    const result = await prepareQuickLaunch(deps(), intent);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.settings.gameMode).toBe(VOCAB_QUIZ_MODE);
  });

  it('uses the teacher\'s pick over the derived mode', async () => {
    const result = await prepareQuickLaunch(deps({ modeOverride: 'blast' }), intent);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.settings.gameMode).toBe('blast');
  });

  it('drops the quiz-only settings when the override is a board mode', async () => {
    const result = await prepareQuickLaunch(deps({ modeOverride: 'word-hunt' }), intent);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.settings.vocabQuizFocus).toBeUndefined();
    expect(result.payload.settings.vocabQuizQuestionCount).toBeUndefined();
  });

  it('adds the quiz settings when the override IS the quiz', async () => {
    const bare = {
      id: 'l-2', name: 'Spelling', language: 'en',
      words: [{ word: 'bright' }, { word: 'plant' }],
    } as never;
    const result = await prepareQuickLaunch(
      deps({ getLessonById: vi.fn(async () => bare), modeOverride: VOCAB_QUIZ_MODE }),
      intent
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.settings.gameMode).toBe(VOCAB_QUIZ_MODE);
    expect(result.payload.settings.vocabQuizFocus).toBe('any');
    expect(result.payload.settings.vocabQuizQuestionCount).toBeGreaterThan(0);
  });
});
