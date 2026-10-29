import { describe, it, expect } from 'vitest';
import type { StudentLesson } from '@/hooks/useStudentProgress';
import { studentWarmup, buildTodayItems } from '../todayItems';

const words = (list: string[]) => list.map((word) => ({ word, definition: `${word} means` }));
const entry = (over: Partial<StudentLesson> & { language?: string; focus?: string | null; list?: string[] }): StudentLesson =>
  ({
    lessonId: 'L1',
    status: 'assigned',
    classroomId: 'c1',
    dueDate: '2026-10-30',
    assignment: { id: 'A1', lesson_id: 'L1', classroom_id: 'c1', due_date: '2026-10-30', created_at: '2026-10-29', practice_focus: over.focus ?? null },
    lesson: { id: 'L1', name: 'Planets', language: over.language ?? 'en', words: words(over.list ?? ['planet', 'orbit', 'comet', 'galaxy']) },
    ...over,
  }) as unknown as StudentLesson;

describe('studentWarmup', () => {
  it('Given an open practice assignment, Then the warm-up opens the most game-like drill with three review words', () => {
    const warmup = studentWarmup([entry({})], 'en', 'c1');
    expect(warmup).toEqual(
      expect.objectContaining({ assignmentId: 'A1', lessonId: 'L1', title: 'Planets', href: '/en/student/lessons/L1?mode=blitz', words: ['planet', 'orbit', 'comet'] })
    );
  });

  it('Given a Russian list, Then the warm-up still opens a drill that works in Russian', () => {
    expect(studentWarmup([entry({ language: 'ru', list: ['кошка', 'собака', 'школа', 'книга'] })], 'he', 'c1')?.href).toBe('/he/student/lessons/L1?mode=blitz');
  });

  it('Given the teacher chose Word Craft, Then the warm-up keeps the teacher’s game', () => {
    expect(studentWarmup([entry({ focus: 'wordcraft' })], 'en', 'c1')?.href).toContain('variant=wordcraft');
  });

  it('Given no open assignment, Then there is no warm-up', () => {
    expect(studentWarmup([entry({ status: 'completed' })], 'en', 'c1')).toBeNull();
    expect(studentWarmup([], 'en', 'c1')).toBeNull();
  });
});

describe('buildTodayItems', () => {
  it('lists warm-up, chest and streak in that order with their done state', () => {
    const items = buildTodayItems({ warmup: studentWarmup([entry({})], 'en', 'c1'), chestOpen: true, streak: 4, streakDoneToday: false });
    expect(items.map((i) => [i.id, i.done])).toEqual([['warmup', false], ['chest', false], ['streak', false]]);
    expect(items[2].count).toBe(4);
  });

  it('marks a claimed chest and a played day as done, and no homework as nothing to warm up', () => {
    const items = buildTodayItems({ warmup: null, chestOpen: false, streak: 2, streakDoneToday: true });
    expect(items.map((i) => i.done)).toEqual([true, true, true]);
  });
});
