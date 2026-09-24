import { describe, it, expect } from 'vitest';
import { lessonStars, lessonHref, lessonMastery, ISLANDS } from '../academyNodes';
import type { StudentLesson } from '@/hooks/useStudentProgress';

const words = (n: number) => Array.from({ length: n }, (_, i) => ({ word: `w${i}`, level: 'core' }));

function lesson(
  id: string,
  opts: { status?: StudentLesson['status']; mastered?: number; words?: number; focus?: string | null } = {},
): StudentLesson {
  const { status = 'assigned', mastered, words: n = 5, focus } = opts;
  return {
    lessonId: id,
    status,
    lesson: { id, name: `Lesson ${id}`, words: words(n) } as never,
    ...(mastered != null
      ? { progress: { words_mastered: Array.from({ length: mastered }, (_, i) => `w${i}`) } as never }
      : {}),
    ...(focus !== undefined ? { assignment: { practice_focus: focus } as never } : {}),
  };
}

describe('lessonStars', () => {
  it('gives nothing to a lesson not yet finished', () => {
    expect(lessonStars('assigned', 100)).toBe(0);
    expect(lessonStars('started', 80)).toBe(0);
  });
  it('gives 1-3 stars to a finished lesson by mastery', () => {
    expect(lessonStars('completed', 10)).toBe(1);
    expect(lessonStars('completed', 60)).toBe(2);
    expect(lessonStars('completed', 95)).toBe(3);
  });
});

/*
 * buildAcademyNodes (islands padded with "Coming soon" placeholders) was
 * replaced by buildAcademyIslands — see academyIslands.test.ts, which carries
 * over the done/next/open states, path order, next-lesson windowing and the
 * zero-mastery rule, and REPLACES the two "fill every island with locked
 * placeholders" cases: the r2 spec forbids dead islands.
 */
describe('lessonHref', () => {
  it('picks node art and the practice deep link by what the teacher assigned', () => {
    const wc = lessonHref(lesson('wc', { focus: 'wordcraft' }), 'he');
    expect(wc).toEqual({ type: 'wordcraft', href: '/he/student/lessons/wc?mode=solo_board&variant=wordcraft' });
    const q = lessonHref(lesson('q', { focus: 'synonym' }), 'he');
    expect(q.type).toBe('quiz');
    expect(q.href).toContain('/he/student/lessons/q?mode=vocab_focus');
    expect(lessonHref(lesson('plain'), 'he')).toEqual({ type: 'lesson', href: '/he/student/lessons/plain' });
  });
});

describe('lessonMastery', () => {
  it('never counts a lesson with no words at this level as mastered', () => {
    expect(lessonMastery(lesson('e', { status: 'started', mastered: 0, words: 0 }))).toBe(0);
  });
  it('is the share of words at this level mastered', () => {
    expect(lessonMastery(lesson('b', { status: 'started', mastered: 1 }))).toBe(20);
  });
});

describe('ISLANDS', () => {
  it('uses physical percentages inside the art (never mirrored for RTL)', () => {
    for (const layout of [ISLANDS.portrait, ISLANDS.landscape]) {
      for (const p of layout) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(100);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(100);
      }
    }
  });
});
