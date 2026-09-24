/**
 * Which mode cards the teacher's launch screen shows, and with which art.
 *
 * Most-played first (PostHog 60d: vocab-quiz 15, classic 10, blast 3), three
 * big cards in one row; the rest fold behind a quiet "More games". The mode
 * GO LIVE names must always be on screen, so a folded-away selection takes the
 * last featured slot instead of disappearing.
 */

const RANKED = ['vocab-quiz', 'classic', 'blast', 'word-hunt', 'wheel-rush'];

export const FEATURED_MODE_COUNT = 3;

export function visibleModeIds<T extends string>(catalog: readonly T[], selected: T, expanded: boolean): T[] {
  const rank = (id: string) => {
    const i = RANKED.indexOf(id);
    return i === -1 ? RANKED.length : i;
  };
  const ordered = [...catalog].sort((a, b) => rank(a) - rank(b));
  if (expanded) return ordered;
  const featured = ordered.slice(0, FEATURED_MODE_COUNT);
  if (!featured.includes(selected) && catalog.includes(selected)) {
    featured[featured.length - 1] = selected;
  }
  return featured;
}

export function modeCardArt(id: string): string {
  if (id === 'vocab-quiz') return '/images/education/node-quiz.webp';
  if (id === 'wordcraft' || id === 'word-craft') return '/images/education/node-wordcraft.webp';
  return '/images/education/node-arena.webp';
}
