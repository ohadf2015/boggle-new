/**
 * The express runner: everything between "teacher pressed GO LIVE" and
 * "createClassroomGame is on the wire", with no screen in between.
 *
 * The two things worth testing hard:
 *  - it provisions whatever is missing (classroom, lesson) rather than sending
 *    the teacher back to make it — that IS the feature;
 *  - every failure comes back as a NAMED failure, never a resolved-but-empty
 *    result. A silent no-op here parks the teacher on a spinner in front of a
 *    class (pitfalls class 4).
 */
import { describe, it, expect, vi } from 'vitest';
import { prepareQuickLaunch, type QuickLaunchDeps } from '../ClassroomGameLobbyExpressRunner';
import type { QuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';

const CLASSROOM = { id: 'c-1', name: 'My Class', language: 'en' } as never;

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

const lessonIntent: QuickLaunchIntent = {
  source: 'lesson', lessonId: 'l-1', title: 'Unit 4', language: 'en', createdAt: Date.now(),
};

describe('prepareQuickLaunch', () => {
  it('reuses an existing classroom and the saved lesson, asking for nothing', async () => {
    const d = deps();
    const result = await prepareQuickLaunch(d, lessonIntent);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(d.createClassroom).not.toHaveBeenCalled();
    expect(result.payload.classroomId).toBe('c-1');
    expect(result.payload.lessonIds).toEqual(['l-1']);
    expect(result.payload.vocabularyWords).toHaveLength(6);
    expect(result.payload.gameCode).toBe('ABC234');
  });

  it('provisions a classroom silently when the teacher has none — no roster step', async () => {
    const createClassroom = vi.fn(async () => ({ success: true, data: { ...CLASSROOM, id: 'c-new' } }));
    const d = deps({ listClassrooms: vi.fn(async () => []), createClassroom });

    const result = await prepareQuickLaunch(d, lessonIntent);

    expect(createClassroom).toHaveBeenCalledWith('My Class', 'en');
    expect(result.ok && result.payload.classroomId).toBe('c-new');
  });

  it('turns a starter pack into a real lesson on the way through', async () => {
    const pack = STARTER_LESSON_PACKS[0];
    const createLesson = vi.fn(async () => ({ data: { ...LESSON, id: 'l-pack' }, error: null }));
    const d = deps({ createLesson });

    const result = await prepareQuickLaunch(d, {
      source: 'pack', packKey: pack.nameKey, title: 'Common English', language: 'en', createdAt: Date.now(),
    });

    expect(createLesson).toHaveBeenCalledTimes(1);
    expect(createLesson.mock.calls[0][0].words).toHaveLength(pack.words.length);
    expect(result.ok && result.payload.lessonIds).toEqual(['l-pack']);
    // Pack words carry definitions, so the mode that actually drills them.
    expect(result.ok && result.payload.settings.gameMode).toBe('vocab-quiz');
  });

  it('sends bare pasted words to a board mode — a quiz would have nothing to ask', async () => {
    // The real API echoes the row it inserted, words and all — so does this.
    const createLesson = vi.fn(async (input: { words: unknown[] }) => ({
      data: { id: 'l-paste', name: 'Today', language: 'en', words: input.words },
      error: null,
    }));
    const d = deps({ createLesson });

    const result = await prepareQuickLaunch(d, {
      source: 'paste',
      words: ['photosynthesis', 'mitosis', 'osmosis'],
      title: 'Today',
      language: 'en',
      createdAt: Date.now(),
    });

    expect(result.ok && result.payload.settings.gameMode).toBe('classic');
    expect(result.ok && result.payload.vocabularyWords).toEqual(['photosynthesis', 'mitosis', 'osmosis']);
  });

  it('names the failure when the class cap blocks the silent classroom', async () => {
    const d = deps({
      listClassrooms: vi.fn(async () => []),
      createClassroom: vi.fn(async () => ({ success: false, error: 'CLASS_LIMIT_REACHED', code: 'CLASS_LIMIT_REACHED' })),
    });

    const result = await prepareQuickLaunch(d, lessonIntent);

    expect(result).toEqual({ ok: false, failure: { code: 'classroom', reason: 'CLASS_LIMIT_REACHED' } });
  });

  it('names the failure when the saved lesson is gone, instead of hosting an empty room', async () => {
    const d = deps({ getLessonById: vi.fn(async () => null) });
    const result = await prepareQuickLaunch(d, lessonIntent);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.failure.code).toBe('lesson');
  });

  it('names the failure when a lesson exists but carries no words at all', async () => {
    const d = deps({ getLessonById: vi.fn(async () => ({ ...LESSON, words: [] })) });
    const result = await prepareQuickLaunch(d, lessonIntent);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.failure.code).toBe('lesson');
  });

  it('reports each stage so the teacher sees progress, not a blank spinner', async () => {
    const onStage = vi.fn();
    await prepareQuickLaunch(deps({ onStage }), lessonIntent);
    expect(onStage.mock.calls.map((c) => c[0])).toEqual(['classroom', 'lesson', 'room']);
  });
});
