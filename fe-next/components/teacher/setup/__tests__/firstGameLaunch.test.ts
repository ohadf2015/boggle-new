import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import { resolveIntentMode } from '@/components/teacher/dashboard/quickLaunchIntent';
import { convertPackWordsToLessonWords } from '@/lib/education/createLessonFromPack';

const assign = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/education/assignments', () => ({ createAssignment: assign }));

import { firstGameIntent, readPasted } from '../firstGameLaunch';

const pack = STARTER_LESSON_PACKS.find((p) => p.language === 'en')!;
const createLesson = vi.fn();
const lessonExists = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  createLesson.mockResolvedValue({ success: true, data: { id: 'L-new' } });
  assign.mockResolvedValue({ data: { id: 'a1' }, error: null });
  lessonExists.mockResolvedValue(true);
});

describe('readPasted', () => {
  it('Given a pasted column with commas, duplicates and a phrase, Then only single distinct words count and the phrase is counted as skipped', () => {
    expect(readPasted('cat, dog\nDog\nrely on\n  bird ;fish')).toEqual({ words: ['cat', 'dog', 'bird', 'fish'], skipped: 1 });
  });

  it('Given only phrases, Then no words count and every entry is skipped', () => {
    expect(readPasted('rely on\nlook up')).toEqual({ words: [], skipped: 2 });
  });

  it('Given nothing pasted, Then there are no words and nothing skipped', () => {
    expect(readPasted('   \n ')).toEqual({ words: [], skipped: 0 });
  });
});

describe('firstGameIntent', () => {
  const base = { classroomId: 'c1', language: 'en', title: 'Words', teacherId: 't1', createLesson, lessonExists };

  it('Given pasted words, Then they are saved as this class list and the launch is Classic on that list id', async () => {
    const launch = await firstGameIntent({ ...base, choice: { kind: 'paste', words: ['cat', 'dog', 'bird'] } });
    expect(createLesson).toHaveBeenCalledWith(expect.objectContaining({ classroomId: 'c1', language: 'en', words: [{ word: 'cat', canIntegrate: true }, { word: 'dog', canIntegrate: true }, { word: 'bird', canIntegrate: true }] }));
    expect(assign).toHaveBeenCalledWith(expect.objectContaining({ classroom_id: 'c1', lesson_id: 'L-new' }));
    expect(launch).toEqual({ intent: { source: 'lesson', lessonId: 'L-new', mode: 'classic', classroomId: 'c1', language: 'en', title: 'Words' }, assignFailed: false });
  });

  it('Given the same pasted words played again for the same class, Then the saved list is reused and nothing new is written', async () => {
    await firstGameIntent({ ...base, choice: { kind: 'paste', words: ['cat', 'dog', 'bird'] } });
    const again = await firstGameIntent({ ...base, choice: { kind: 'paste', words: ['Cat', 'dog', 'bird'] } });
    expect(createLesson).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledTimes(1);
    expect(again.intent).toMatchObject({ source: 'lesson', lessonId: 'L-new' });
  });

  it('Given different words, or another class, Then a new list is saved', async () => {
    await firstGameIntent({ ...base, choice: { kind: 'paste', words: ['cat', 'dog', 'bird'] } });
    await firstGameIntent({ ...base, choice: { kind: 'paste', words: ['cat', 'dog', 'fish'] } });
    await firstGameIntent({ ...base, classroomId: 'c2', choice: { kind: 'paste', words: ['cat', 'dog', 'bird'] } });
    expect(createLesson).toHaveBeenCalledTimes(3);
  });

  it('Given a remembered list that was deleted since, Then the words are saved again', async () => {
    await firstGameIntent({ ...base, choice: { kind: 'pack', pack, lessonId: null } });
    lessonExists.mockResolvedValue(false);
    await firstGameIntent({ ...base, choice: { kind: 'pack', pack, lessonId: null } });
    expect(createLesson).toHaveBeenCalledTimes(2);
  });

  it('Given the starter list already saved at class creation, Then nothing new is written and the launch uses that list', async () => {
    const { intent } = await firstGameIntent({ ...base, choice: { kind: 'pack', pack, lessonId: 'L-pack' } });
    expect(lessonExists).toHaveBeenCalledWith('L-pack');
    expect(createLesson).not.toHaveBeenCalled();
    expect(intent).toMatchObject({ source: 'lesson', lessonId: 'L-pack', mode: 'classic', classroomId: 'c1', language: pack.language });
  });

  it('Given a saved list id from the link that no longer exists, Then the pack is saved to the class instead', async () => {
    lessonExists.mockResolvedValue(false);
    const { intent } = await firstGameIntent({ ...base, choice: { kind: 'pack', pack, lessonId: 'L-gone' } });
    expect(createLesson).toHaveBeenCalledTimes(1);
    expect(intent).toMatchObject({ source: 'lesson', lessonId: 'L-new' });
  });

  it('Given the link list was gone and the pack was saved instead, When Play now runs again, Then that new list is reused', async () => {
    lessonExists.mockImplementation(async (id: string) => id !== 'L-gone');
    await firstGameIntent({ ...base, choice: { kind: 'pack', pack, lessonId: 'L-gone' } });
    const again = await firstGameIntent({ ...base, choice: { kind: 'pack', pack, lessonId: 'L-gone' } });
    expect(createLesson).toHaveBeenCalledTimes(1);
    expect(again.intent).toMatchObject({ lessonId: 'L-new' });
  });

  it('Given the lookup of a saved list fails, Then that list is still used rather than saving a duplicate', async () => {
    lessonExists.mockRejectedValue(new Error('offline'));
    const { intent } = await firstGameIntent({ ...base, choice: { kind: 'pack', pack, lessonId: 'L-pack' } });
    expect(createLesson).not.toHaveBeenCalled();
    expect(intent).toMatchObject({ lessonId: 'L-pack' });
  });

  it('Given a starter pack that is not saved yet, Then it is saved to the class first', async () => {
    const { intent } = await firstGameIntent({ ...base, choice: { kind: 'pack', pack, lessonId: null } });
    expect(createLesson).toHaveBeenCalledWith(expect.objectContaining({ classroomId: 'c1', language: pack.language, words: convertPackWordsToLessonWords(pack.words) }));
    expect(intent).toMatchObject({ source: 'lesson', lessonId: 'L-new', mode: 'classic' });
  });

  it('Given the list saves but the homework assignment fails, Then the launch says so', async () => {
    assign.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const launch = await firstGameIntent({ ...base, choice: { kind: 'paste', words: ['cat', 'dog', 'bird'] } });
    expect(launch).toMatchObject({ intent: { source: 'lesson', lessonId: 'L-new' }, assignFailed: true });
  });

  it('Given the save fails, Then the launch still carries the words so the lobby can make the list itself', async () => {
    createLesson.mockResolvedValue({ success: false, error: 'offline' });
    expect((await firstGameIntent({ ...base, choice: { kind: 'paste', words: ['cat', 'dog', 'bird'] } })).intent).toMatchObject({ source: 'paste', words: ['cat', 'dog', 'bird'], mode: 'classic', classroomId: 'c1' });
    createLesson.mockRejectedValue(new Error('boom'));
    expect((await firstGameIntent({ ...base, choice: { kind: 'pack', pack, lessonId: null } })).intent).toMatchObject({ source: 'pack', packKey: pack.nameKey, mode: 'classic' });
  });

  it('Given pack words that carry definitions, Then the lobby still runs Classic, not the quiz', () => {
    expect(resolveIntentMode('classic', convertPackWordsToLessonWords(pack.words))).toBe('classic');
  });
});

describe('firstGameIntent for the teacher list saved at class setup', () => {
  const base = { classroomId: 'c1', language: 'he', title: 'Words', teacherId: 't1', createLesson, lessonExists };

  it('Given the saved list exists, Then the launch is Classic on that list in the class language and nothing new is written', async () => {
    const launch = await firstGameIntent({ ...base, choice: { kind: 'saved', lessonId: 'L-own', fallback: pack, fallbackTitle: 'Pack' } });
    expect(lessonExists).toHaveBeenCalledWith('L-own');
    expect(createLesson).not.toHaveBeenCalled();
    expect(launch).toEqual({ intent: { source: 'lesson', lessonId: 'L-own', mode: 'classic', classroomId: 'c1', language: 'he', title: 'Words' }, assignFailed: false });
  });

  it('Given the saved list is gone or is not this teacher\'s, Then the starter pack is saved and played instead, and the launch says the list was missing', async () => {
    lessonExists.mockResolvedValue(false);
    const launch = await firstGameIntent({ ...base, choice: { kind: 'saved', lessonId: 'L-gone', fallback: pack, fallbackTitle: 'Pack' } });
    expect(createLesson).toHaveBeenCalledWith(expect.objectContaining({ classroomId: 'c1', language: pack.language, words: convertPackWordsToLessonWords(pack.words) }));
    expect(launch).toMatchObject({ intent: { source: 'lesson', lessonId: 'L-new', language: pack.language, title: 'Pack' }, listMissing: true });
  });

  it('Given the lookup fails, Then the saved list is still used, like every other remembered list', async () => {
    lessonExists.mockRejectedValue(new Error('offline'));
    const launch = await firstGameIntent({ ...base, choice: { kind: 'saved', lessonId: 'L-own', fallback: pack, fallbackTitle: 'Pack' } });
    expect(createLesson).not.toHaveBeenCalled();
    expect(launch.intent).toMatchObject({ lessonId: 'L-own' });
    expect(launch.listMissing).toBeUndefined();
  });
});
