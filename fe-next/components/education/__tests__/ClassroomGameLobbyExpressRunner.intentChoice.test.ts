/**
 * Teacher HQ hands the express lobby the class and the game the teacher picked.
 *
 * Both ride on the quick-launch intent. Both are advisory: a class id the
 * teacher no longer owns, or a mode the server's enum does not know, must fall
 * back to the old derived behaviour instead of shipping a payload the backend
 * silently rejects (pitfall class 4 — the room would just never appear).
 */
import { describe, it, expect, vi } from 'vitest';
import { prepareQuickLaunch, type QuickLaunchDeps } from '../ClassroomGameLobbyExpressRunner';
import type { QuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';
import { VOCAB_QUIZ_MODE } from '@/shared/types/vocabQuiz';

const NEWEST = { id: 'c-new', name: 'Newest', language: 'en' } as never;
const OTHER = { id: 'c-other', name: 'Period 3', language: 'en' } as never;

const DEFINED = {
  id: 'l-1',
  name: 'Unit 4',
  language: 'en',
  words: Array.from({ length: 6 }, (_, i) => ({ word: `word${i}`, definition: `def${i}` })),
} as never;
const BARE = {
  id: 'l-2',
  name: 'Spelling',
  language: 'en',
  words: [{ word: 'bright' }, { word: 'plant' }, { word: 'river' }],
} as never;

function deps(over: Partial<QuickLaunchDeps> = {}): QuickLaunchDeps {
  return {
    userId: 'u-1',
    teacherName: 'Ms Cohen',
    gameCode: 'ABC234',
    defaultClassName: 'My Class',
    uiLanguage: 'en',
    listClassrooms: vi.fn(async () => [NEWEST, OTHER]),
    createClassroom: vi.fn(async () => ({ success: true, data: NEWEST })),
    getLessonById: vi.fn(async () => DEFINED),
    createLesson: vi.fn(async () => ({ data: DEFINED, error: null })),
    onStage: vi.fn(),
    ...over,
  } as QuickLaunchDeps;
}

const base: QuickLaunchIntent = {
  source: 'lesson',
  lessonId: 'l-1',
  title: 'Unit 4',
  language: 'en',
  createdAt: Date.now(),
};

describe('prepareQuickLaunch — class chosen on Teacher HQ', () => {
  it('Given the teacher picked a class they own, Then the room hangs off that class', async () => {
    const r = await prepareQuickLaunch(deps(), { ...base, classroomId: 'c-other' });
    expect(r.ok && r.payload.classroomId).toBe('c-other');
  });

  it('Given a class id they no longer own, Then it falls back to the newest class', async () => {
    const r = await prepareQuickLaunch(deps(), { ...base, classroomId: 'c-gone' });
    expect(r.ok && r.payload.classroomId).toBe('c-new');
  });

  it('Given no class id, Then behaviour is unchanged (newest class)', async () => {
    const r = await prepareQuickLaunch(deps(), base);
    expect(r.ok && r.payload.classroomId).toBe('c-new');
  });
});

describe('prepareQuickLaunch — mode chosen on Teacher HQ', () => {
  it('Given a valid board mode, Then that mode is launched', async () => {
    const r = await prepareQuickLaunch(deps(), { ...base, mode: 'blast' });
    expect(r.ok && r.payload.settings.gameMode).toBe('blast');
  });

  it('Given an unknown mode string, Then the derived mode is used instead', async () => {
    const r = await prepareQuickLaunch(deps(), { ...base, mode: 'nonsense' as never });
    expect(r.ok && r.payload.settings.gameMode).toBe(VOCAB_QUIZ_MODE);
  });

  it('Given the quiz on words without definitions, Then it downgrades to the derived board mode', async () => {
    const r = await prepareQuickLaunch(
      deps({ getLessonById: vi.fn(async () => BARE) }),
      { ...base, mode: VOCAB_QUIZ_MODE }
    );
    expect(r.ok && r.payload.settings.gameMode).toBe('classic');
  });

  it('Given the lobby poster override too, Then the override still wins', async () => {
    const r = await prepareQuickLaunch(deps({ modeOverride: 'word-hunt' }), { ...base, mode: 'blast' });
    expect(r.ok && r.payload.settings.gameMode).toBe('word-hunt');
  });
});
