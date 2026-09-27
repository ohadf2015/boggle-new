import { describe, it, expect } from 'vitest';
import {
  buildAcademyIslands,
  bossProgress,
  pickNextAction,
  mapFraming,
  placeIslands,
  type IslandInput,
} from '../academyIslands';
import { ISLANDS, CASTLE } from '../academyNodes';
import type { StudentLesson } from '@/hooks/useStudentProgress';

const words = (n: number) => Array.from({ length: n }, (_, i) => ({ word: `w${i}`, level: 'core' }));

function lesson(
  id: string,
  opts: { status?: StudentLesson['status']; mastered?: number; words?: number } = {},
): StudentLesson {
  const { status = 'assigned', mastered, words: n = 5 } = opts;
  return {
    lessonId: id,
    status,
    lesson: { id, name: `Lesson ${id}`, words: words(n) } as never,
    ...(mastered != null
      ? { progress: { words_mastered: Array.from({ length: mastered }, (_, i) => `w${i}`) } as never }
      : {}),
  };
}

const base = (over: Partial<IslandInput> = {}): IslandInput => ({
  lessons: [lesson('a')],
  locale: 'en',
  level: 'core',
  hasClass: true,
  live: false,
  reviewLessonId: 'a',
  reviewCount: 0,
  slots: 5,
  ...over,
});

describe('buildAcademyIslands — every island is a real destination', () => {
  it('lays the path out as: lessons, Word Workshop, Missed Words Review, Class Arena — never a placeholder', () => {
    // Given one lesson on a 5-slot portrait map
    const { islands } = buildAcademyIslands(base());
    // Then four real islands, in path order, and nothing padded
    expect(islands.map((n) => n.kind)).toEqual(['lesson', 'workshop', 'review', 'arena']);
    expect(islands.every((n) => n.kind !== ('placeholder' as never))).toBe(true);
    expect(islands.every((n) => n.state !== 'locked')).toBe(true);
  });

  it('links Word Workshop to /student/craft for the current lesson and Review to /student/review', () => {
    const { islands } = buildAcademyIslands(base({ locale: 'he', reviewLessonId: 'a' }));
    const workshop = islands.find((n) => n.kind === 'workshop')!;
    const review = islands.find((n) => n.kind === 'review')!;
    expect(workshop).toMatchObject({ type: 'wordcraft', href: '/he/student/craft?lesson=a' });
    expect(review).toMatchObject({ type: 'quiz', href: '/he/student/review?lesson=a' });
  });

  it('points Word Workshop at the NEXT unfinished lesson, not a finished one', () => {
    const { islands } = buildAcademyIslands(
      base({ lessons: [lesson('done', { status: 'completed', mastered: 5 }), lesson('todo')] }),
    );
    expect(islands.find((n) => n.kind === 'workshop')!.href).toBe('/en/student/craft?lesson=todo');
  });

  it('puts the review-due count on the review island as a badge', () => {
    const { islands } = buildAcademyIslands(base({ reviewCount: 5 }));
    expect(islands.find((n) => n.kind === 'review')).toMatchObject({ badge: 5 });
  });

  it('keeps the Class Arena waiting while the teacher is not live, and live when they are', () => {
    const idle = buildAcademyIslands(base()).islands.find((n) => n.kind === 'arena')!;
    expect(idle).toMatchObject({ state: 'waiting', type: 'arena' });
    expect(idle.href).toBeUndefined();
    const live = buildAcademyIslands(base({ live: true })).islands.find((n) => n.kind === 'arena')!;
    expect(live.state).toBe('live');
  });

  it('shows fewer islands for a class with no lessons yet: just the arena, no boss', () => {
    const { islands, boss } = buildAcademyIslands(base({ lessons: [], reviewLessonId: '' }));
    expect(islands.map((n) => n.kind)).toEqual(['arena']);
    expect(boss).toBeNull();
  });

  it('draws no islands at all for a student with no class (the CTA joins one)', () => {
    const { islands, boss } = buildAcademyIslands(base({ hasClass: false }));
    expect(islands).toEqual([]);
    expect(boss).toBeNull();
  });

  it('marks finished lessons done with stars, the first unfinished next, later ones open', () => {
    const { islands } = buildAcademyIslands(
      base({
        slots: 6,
        lessons: [
          lesson('a', { status: 'completed', mastered: 5 }),
          lesson('b', { status: 'started', mastered: 1 }),
          lesson('c'),
        ],
      }),
    );
    const [a, b, c] = islands.filter((n) => n.kind === 'lesson');
    expect(a).toMatchObject({ state: 'done', stars: 3 });
    expect(b).toMatchObject({ state: 'next', mastery: 20 });
    expect(c).toMatchObject({ state: 'open' });
  });

  it('windows lessons so the fixed islands always fit and the next lesson stays on the map', () => {
    const many = [
      ...Array.from({ length: 6 }, (_, i) => lesson(`d${i}`, { status: 'completed', mastered: 5 })),
      lesson('next'),
      lesson('later'),
    ];
    // Landscape: 4 slots, 3 of them taken by workshop / review / arena
    const { islands } = buildAcademyIslands(base({ lessons: many, slots: 4 }));
    expect(islands).toHaveLength(4);
    expect(islands[0]).toMatchObject({ lessonId: 'next', state: 'next' });
    // Portrait: 5 slots → one done island behind the next one, for momentum
    const tall = buildAcademyIslands(base({ lessons: many, slots: 5 })).islands;
    expect(tall[0]).toMatchObject({ state: 'done' });
    expect(tall[1]).toMatchObject({ lessonId: 'next' });
  });
});

describe('bossProgress — the boss unlocks by mastering words', () => {
  it('counts mastered words against 80% of every word at this level', () => {
    // 2 lessons x 5 words = 10 words → need 8
    const p = bossProgress([lesson('a', { mastered: 3 }), lesson('b', { mastered: 2 })], 'core');
    expect(p).toEqual({ have: 5, need: 8, unlocked: false });
  });

  it('unlocks once the student has mastered enough', () => {
    const p = bossProgress([lesson('a', { mastered: 5 }), lesson('b', { mastered: 4 })], 'core');
    expect(p.unlocked).toBe(true);
    expect(p.have).toBe(8); // capped at the requirement, never "9/8"
  });

  it('never unlocks on an empty word bank', () => {
    expect(bossProgress([lesson('a', { words: 0 })], 'core')).toEqual({ have: 0, need: 0, unlocked: false });
  });
});

describe('buildAcademyIslands — the boss', () => {
  it('is locked with a real progress requirement until mastered, then opens a blitz challenge', () => {
    const locked = buildAcademyIslands(base({ lessons: [lesson('a', { mastered: 2 })] })).boss!;
    expect(locked).toMatchObject({ kind: 'boss', type: 'boss', state: 'locked', progress: { have: 2, need: 4 } });
    expect(locked.href).toBeUndefined();

    const open = buildAcademyIslands(base({ lessons: [lesson('a', { mastered: 5, status: 'completed' })] })).boss!;
    expect(open.state).toBe('open');
    expect(open.href).toBe('/en/student/lessons/a?mode=blitz');
  });
});

describe('pickNextAction — exactly one recommended thing', () => {
  const islandsFor = (over: Partial<IslandInput>) => buildAcademyIslands(base(over));

  it('joins the live game above everything else', () => {
    const r = islandsFor({ live: true, reviewCount: 3 });
    expect(pickNextAction({ hasClass: true, live: true, ...r })).toEqual({ kind: 'live', nodeKey: 'arena' });
  });

  it('sends a student without a class to join one', () => {
    const r = islandsFor({ hasClass: false });
    expect(pickNextAction({ hasClass: false, live: false, ...r })).toEqual({ kind: 'join-class', nodeKey: null });
  });

  it('plays the next unfinished lesson', () => {
    const r = islandsFor({ reviewCount: 3 });
    expect(pickNextAction({ hasClass: true, live: false, ...r })).toEqual({ kind: 'next', nodeKey: 'lesson-a' });
  });

  it('with every lesson done, reviews missed words when any are due', () => {
    const r = islandsFor({ lessons: [lesson('a', { status: 'completed', mastered: 1 })], reviewCount: 3 });
    expect(pickNextAction({ hasClass: true, live: false, ...r })).toEqual({ kind: 'review', nodeKey: 'review' });
  });

  it('then fights an unlocked boss', () => {
    const r = islandsFor({ lessons: [lesson('a', { status: 'completed', mastered: 5 })] });
    expect(pickNextAction({ hasClass: true, live: false, ...r })).toEqual({ kind: 'boss', nodeKey: 'boss' });
  });

  it('then the Word Workshop', () => {
    const r = islandsFor({ lessons: [lesson('a', { status: 'completed', mastered: 1 })] });
    expect(pickNextAction({ hasClass: true, live: false, ...r })).toEqual({ kind: 'workshop', nodeKey: 'workshop' });
  });

  it('falls back to solo practice for a class with nothing assigned', () => {
    const r = islandsFor({ lessons: [], reviewLessonId: '' });
    expect(pickNextAction({ hasClass: true, live: false, ...r })).toEqual({ kind: 'solo', nodeKey: null });
  });
});

describe('placeIslands + mapFraming — fewer islands zoom in, never off-screen', () => {
  it('uses the slots nearest the castle so the path runs unbroken into the boss', () => {
    const pts = placeIslands(3, ISLANDS.portrait);
    expect(pts).toEqual(ISLANDS.portrait.slice(2));
  });

  it('does not zoom when the path already spans the map', () => {
    const f = mapFraming([...ISLANDS.landscape, CASTLE.landscape], { x0: 5, x1: 95, y0: 15, y1: 80 });
    expect(f.scale).toBe(1);
  });

  it('zooms in on a short path and keeps every node inside the safe area', () => {
    const safe = { x0: 5, x1: 95, y0: 15, y1: 80 };
    const pts = [...placeIslands(1, ISLANDS.landscape), CASTLE.landscape];
    const f = mapFraming(pts, safe);
    expect(f.scale).toBeGreaterThan(1);
    expect(f.scale).toBeLessThanOrEqual(1.3);
    for (const p of pts) {
      const x = f.originX + (p.x - f.originX) * f.scale;
      const y = f.originY + (p.y - f.originY) * f.scale;
      expect(x).toBeGreaterThanOrEqual(safe.x0);
      expect(x).toBeLessThanOrEqual(safe.x1);
      expect(y).toBeGreaterThanOrEqual(safe.y0);
      expect(y).toBeLessThanOrEqual(safe.y1);
    }
  });
});
