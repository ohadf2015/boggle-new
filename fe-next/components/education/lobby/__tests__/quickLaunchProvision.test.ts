import { describe, it, expect, vi } from 'vitest';
import { provisionQuickLaunch, type QuickLaunchProvisionDeps } from '../quickLaunchProvision';
import type { QuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import { VOCAB_QUIZ_MODE } from '@/shared/types/vocabQuiz';

const NEWEST = { id: 'c-new', name: 'Newest', language: 'en' } as never;
const OTHER = { id: 'c-other', name: 'Period 3', language: 'en' } as never;

const DEFINED = {
  id: 'l-1',
  name: 'Unit 4',
  language: 'en',
  words: Array.from({ length: 6 }, (_, i) => ({ word: `word${i}`, definition: `def${i}` })),
} as never;
const BARE = { id: 'l-2', name: 'Spelling', language: 'en', words: [{ word: 'bright' }, { word: 'plant' }, { word: 'river' }] } as never;

function deps(over: Partial<QuickLaunchProvisionDeps> = {}): QuickLaunchProvisionDeps {
  return {
    defaultClassName: 'My Class',
    uiLanguage: 'en',
    listClassrooms: vi.fn(async () => [NEWEST, OTHER]),
    createClassroom: vi.fn(async () => ({ success: true, data: NEWEST })),
    getLessonById: vi.fn(async () => DEFINED),
    createLesson: vi.fn(async () => ({ data: DEFINED, error: null })),
    ...over,
  } as QuickLaunchProvisionDeps;
}

const base: QuickLaunchIntent = { source: 'lesson', lessonId: 'l-1', title: 'Unit 4', language: 'en', createdAt: Date.now() };

describe('provisionQuickLaunch: class', () => {
  it('Given a saved lesson and a class, Then it reuses both and creates nothing', async () => {
    const d = deps();
    const r = await provisionQuickLaunch(d, base);
    expect(r).toEqual({ ok: true, classroomId: 'c-new', lessonId: 'l-1', mode: VOCAB_QUIZ_MODE });
    expect(d.createClassroom).not.toHaveBeenCalled();
    expect(d.createLesson).not.toHaveBeenCalled();
  });

  it('Given the teacher picked a class they own, Then that class is used', async () => {
    const r = await provisionQuickLaunch(deps(), { ...base, classroomId: 'c-other' });
    expect(r.ok && r.classroomId).toBe('c-other');
  });

  it('Given a class id they no longer own, Then it falls back to the newest class', async () => {
    const r = await provisionQuickLaunch(deps(), { ...base, classroomId: 'c-gone' });
    expect(r.ok && r.classroomId).toBe('c-new');
  });

  it('Given no class at all, Then one is created silently and reported as new', async () => {
    const createClassroom = vi.fn(async () => ({ success: true, data: { ...(NEWEST as object), id: 'c-made' } as never }));
    const r = await provisionQuickLaunch(deps({ listClassrooms: vi.fn(async () => []), createClassroom }), base);
    expect(createClassroom).toHaveBeenCalledWith('My Class', 'en');
    expect(r.ok && r.classroomId).toBe('c-made');
  });

  it('Given the class cap blocks the new class, Then the failure is named', async () => {
    const r = await provisionQuickLaunch(
      deps({
        listClassrooms: vi.fn(async () => []),
        createClassroom: vi.fn(async () => ({ success: false, error: 'CLASS_LIMIT_REACHED', code: 'CLASS_LIMIT_REACHED' })),
      }),
      base,
    );
    expect(r).toEqual({ ok: false, failure: { code: 'classroom', reason: 'CLASS_LIMIT_REACHED' } });
  });

  it('Given listing classes throws, Then the failure is named, not thrown', async () => {
    const r = await provisionQuickLaunch(deps({ listClassrooms: vi.fn(async () => { throw new Error('down'); }) }), base);
    expect(!r.ok && r.failure.code).toBe('classroom');
  });
});

describe('provisionQuickLaunch: words', () => {
  it('Given a starter pack, Then it becomes one real lesson and the quiz is chosen', async () => {
    const pack = STARTER_LESSON_PACKS[0];
    const createLesson = vi.fn(async (_input: { words: unknown[] }) => ({ data: { ...(DEFINED as object), id: 'l-pack' } as never, error: null }));
    const r = await provisionQuickLaunch(deps({ createLesson }), { source: 'pack', packKey: pack.nameKey, title: 'Pack', language: 'en', createdAt: 0 });
    expect(createLesson).toHaveBeenCalledTimes(1);
    expect(createLesson.mock.calls[0][0].words).toHaveLength(pack.words.length);
    expect(r).toMatchObject({ ok: true, lessonId: 'l-pack', mode: VOCAB_QUIZ_MODE });
  });

  it('Given pasted bare words, Then multi-word terms are dropped and a board mode is chosen', async () => {
    const createLesson = vi.fn(async (input: { words: unknown[] }) => ({ data: { id: 'l-paste', name: 'Today', language: 'en', words: input.words } as never, error: null }));
    const r = await provisionQuickLaunch(deps({ createLesson }), { source: 'paste', words: ['photosynthesis', 'rely on', 'mitosis'], title: 'Today', language: 'en', createdAt: 0 });
    expect((createLesson.mock.calls[0][0].words as Array<{ word: string }>).map((w) => w.word)).toEqual(['photosynthesis', 'mitosis']);
    expect(r).toMatchObject({ ok: true, lessonId: 'l-paste', mode: 'classic' });
  });

  it('Given the saved lesson is gone, Then the failure is named', async () => {
    const r = await provisionQuickLaunch(deps({ getLessonById: vi.fn(async () => null) }), base);
    expect(r).toEqual({ ok: false, failure: { code: 'lesson', reason: 'NOT_FOUND' } });
  });

  it('Given the saved lesson has no words, Then the failure is named', async () => {
    const r = await provisionQuickLaunch(deps({ getLessonById: vi.fn(async () => ({ ...(DEFINED as object), words: [] }) as never) }), base);
    expect(r).toEqual({ ok: false, failure: { code: 'lesson', reason: 'EMPTY' } });
  });

  it('Given an unknown pack, Then the failure is named', async () => {
    const r = await provisionQuickLaunch(deps(), { source: 'pack', packKey: 'nope', title: 'x', language: 'en', createdAt: 0 });
    expect(r).toEqual({ ok: false, failure: { code: 'lesson', reason: 'PACK_NOT_FOUND' } });
  });
});

describe('provisionQuickLaunch: mode chosen on Teacher HQ', () => {
  it('Given a valid board mode, Then that mode is kept', async () => {
    const r = await provisionQuickLaunch(deps(), { ...base, mode: 'blast' });
    expect(r.ok && r.mode).toBe('blast');
  });

  it('Given an unknown mode string, Then the derived mode is used', async () => {
    const r = await provisionQuickLaunch(deps(), { ...base, mode: 'nonsense' as never });
    expect(r.ok && r.mode).toBe(VOCAB_QUIZ_MODE);
  });

  it('Given the quiz on words without definitions, Then it falls back to the board mode', async () => {
    const r = await provisionQuickLaunch(deps({ getLessonById: vi.fn(async () => BARE) }), { ...base, mode: VOCAB_QUIZ_MODE });
    expect(r.ok && r.mode).toBe('classic');
  });
});
