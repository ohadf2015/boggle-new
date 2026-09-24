/**
 * Academy Map model — which real destination sits on which island, what the
 * boss asks of you, and the ONE thing the hub recommends next.
 *
 * Pure: no React, no fetching. Every island is somewhere a student can go:
 *   lessons (their homework) → Word Workshop → Missed Words Review → Class Arena
 * and the castle at the end of the path is the boss, locked behind a real
 * mastery requirement. A class with less on it gets FEWER islands (and the map
 * zooms in); it is never padded with "coming soon" placeholders.
 */

import type { StudentLesson } from '@/hooks/useStudentProgress';
import type { VocabularyLevel } from '@/lib/supabase/education/types';
import { wordsForLevel } from '@/lib/education/differentiation';
import { lessonHref, lessonMastery, lessonStars, type IslandPoint, type NodeType } from './academyNodes';

export type IslandKind = 'lesson' | 'workshop' | 'review' | 'arena' | 'boss';
export type IslandState = 'done' | 'next' | 'open' | 'locked' | 'waiting' | 'live';

export interface AcademyIsland {
  key: string;
  kind: IslandKind;
  type: NodeType;
  state: IslandState;
  lessonId?: string;
  name?: string;
  stars: number;
  /** 0-100, words mastered at this student's level (lessons only). */
  mastery: number;
  href?: string;
  /** Small count bubble (review: words due). */
  badge?: number;
  /** Boss requirement: mastered words vs words needed. */
  progress?: { have: number; need: number };
}

export interface IslandInput {
  lessons: StudentLesson[];
  locale: string;
  level?: VocabularyLevel | null;
  hasClass: boolean;
  live: boolean;
  reviewLessonId: string;
  reviewCount: number;
  /** Island slots the current art has. */
  slots: number;
}

/** Share of every word at your level you must master before the boss opens. */
export const BOSS_MASTERY_SHARE = 0.8;

export function bossProgress(
  lessons: StudentLesson[],
  level?: VocabularyLevel | null,
): { have: number; need: number; unlocked: boolean } {
  let total = 0;
  let mastered = 0;
  for (const entry of lessons) {
    const atLevel = wordsForLevel(entry.lesson?.words ?? [], level ?? null).length;
    total += atLevel;
    mastered += Math.min(atLevel, (entry.progress?.words_mastered ?? []).length);
  }
  const need = total === 0 ? 0 : Math.ceil(total * BOSS_MASTERY_SHARE);
  const unlocked = need > 0 && mastered >= need;
  return { have: Math.min(mastered, need), need, unlocked };
}

function orderedLessons(lessons: StudentLesson[]): StudentLesson[] {
  // Done first (they are behind you on the path), then unfinished in the
  // order the progress hook sorted them.
  return [
    ...lessons.filter((l) => l.status === 'completed'),
    ...lessons.filter((l) => l.status !== 'completed'),
  ];
}

export function buildAcademyIslands(input: IslandInput): { islands: AcademyIsland[]; boss: AcademyIsland | null } {
  const { lessons, locale, level, hasClass, live, reviewLessonId, reviewCount, slots } = input;
  if (!hasClass) return { islands: [], boss: null };

  const ordered = orderedLessons(lessons);
  const nextIndex = ordered.findIndex((l) => l.status !== 'completed');
  const lessonIslands: AcademyIsland[] = ordered.map((entry, i) => {
    const mastery = lessonMastery(entry, level);
    const { type, href } = lessonHref(entry, locale);
    return {
      key: `lesson-${entry.lessonId}`,
      kind: 'lesson',
      lessonId: entry.lessonId,
      name: entry.lesson?.name,
      type,
      state: entry.status === 'completed' ? 'done' : i === nextIndex ? 'next' : 'open',
      stars: lessonStars(entry.status, mastery),
      mastery,
      href,
    };
  });

  const fixed: AcademyIsland[] = [];
  // The lesson the workshop / boss work on: the one you are on, else the latest.
  const current = nextIndex >= 0 ? ordered[nextIndex] : ordered[ordered.length - 1];
  if (current) {
    fixed.push({
      key: 'workshop',
      kind: 'workshop',
      type: 'wordcraft',
      state: 'open',
      stars: 0,
      mastery: 0,
      href: `/${locale}/student/craft?lesson=${encodeURIComponent(current.lessonId)}`,
    });
  }
  if (reviewLessonId) {
    fixed.push({
      key: 'review',
      kind: 'review',
      type: 'quiz',
      state: 'open',
      stars: 0,
      mastery: 0,
      href: `/${locale}/student/review?lesson=${encodeURIComponent(reviewLessonId)}`,
      ...(reviewCount > 0 ? { badge: reviewCount } : {}),
    });
  }
  fixed.push({
    key: 'arena',
    kind: 'arena',
    type: 'arena',
    state: live ? 'live' : 'waiting',
    stars: 0,
    mastery: 0,
  });

  // Window the lessons so the fixed islands always fit: keep the next lesson
  // on screen, with one done island behind it when there is room.
  const room = Math.max(1, slots - fixed.length);
  let start = 0;
  if (lessonIslands.length > room) {
    start = nextIndex < 0 ? lessonIslands.length - room : Math.max(0, nextIndex - (room > 1 ? 1 : 0));
    start = Math.min(start, lessonIslands.length - room);
  }
  const islands = [...lessonIslands.slice(start, start + room), ...fixed].slice(-Math.max(slots, fixed.length));

  const req = bossProgress(lessons, level);
  const boss: AcademyIsland | null =
    req.need > 0 && current
      ? {
          key: 'boss',
          kind: 'boss',
          type: 'boss',
          state: req.unlocked ? 'open' : 'locked',
          stars: 0,
          mastery: 0,
          progress: { have: req.have, need: req.need },
          ...(req.unlocked
            ? { href: `/${locale}/student/lessons/${encodeURIComponent(current.lessonId)}?mode=blitz` }
            : {}),
        }
      : null;

  return { islands, boss };
}

export type NextActionKind = 'live' | 'join-class' | 'next' | 'review' | 'boss' | 'workshop' | 'solo';

export function pickNextAction(opts: {
  hasClass: boolean;
  live: boolean;
  islands: AcademyIsland[];
  boss: AcademyIsland | null;
}): { kind: NextActionKind; nodeKey: string | null } {
  const { hasClass, live, islands, boss } = opts;
  if (live && hasClass) return { kind: 'live', nodeKey: 'arena' };
  if (!hasClass) return { kind: 'join-class', nodeKey: null };
  const next = islands.find((n) => n.kind === 'lesson' && n.state === 'next');
  if (next) return { kind: 'next', nodeKey: next.key };
  const review = islands.find((n) => n.kind === 'review');
  if (review?.badge) return { kind: 'review', nodeKey: review.key };
  if (boss?.href) return { kind: 'boss', nodeKey: boss.key };
  if (islands.some((n) => n.kind === 'workshop')) return { kind: 'workshop', nodeKey: 'workshop' };
  return { kind: 'solo', nodeKey: null };
}

/** The last `n` slots — the ones nearest the castle — so the path runs unbroken into the boss. */
export function placeIslands(n: number, slots: IslandPoint[]): IslandPoint[] {
  return slots.slice(Math.max(0, slots.length - n));
}

export interface SafeRect { x0: number; x1: number; y0: number; y1: number }

const MAX_ZOOM = 1.3;

/**
 * Zoom the art in on the used stretch of the path. Returns a scale about an
 * origin (both in % of the art); the largest scale ≤ MAX_ZOOM that keeps every
 * point inside `safe` (clear of the HUD and the bottom panel).
 */
export function mapFraming(points: IslandPoint[], safe: SafeRect): { scale: number; originX: number; originY: number } {
  if (points.length === 0) return { scale: 1, originX: 50, originY: 50 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const originX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const originY = (Math.min(...ys) + Math.max(...ys)) / 2;
  // A path that already spans most of the safe area needs no zoom.
  const spread = Math.max(
    (Math.max(...xs) - Math.min(...xs)) / (safe.x1 - safe.x0),
    (Math.max(...ys) - Math.min(...ys)) / (safe.y1 - safe.y0),
  );
  if (spread >= 0.8) return { scale: 1, originX, originY };
  let scale = MAX_ZOOM;
  for (const p of points) {
    const dx = p.x - originX;
    const dy = p.y - originY;
    if (dx < 0) scale = Math.min(scale, (originX - safe.x0) / -dx);
    if (dx > 0) scale = Math.min(scale, (safe.x1 - originX) / dx);
    if (dy < 0) scale = Math.min(scale, (originY - safe.y0) / -dy);
    if (dy > 0) scale = Math.min(scale, (safe.y1 - originY) / dy);
  }
  scale = Math.max(1, Math.floor(scale * 100) / 100);
  // A barely-there zoom only blurs the art.
  if (scale < 1.05) scale = 1;
  return { scale, originX, originY };
}
