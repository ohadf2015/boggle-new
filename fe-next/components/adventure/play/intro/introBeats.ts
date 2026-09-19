/**
 * The level intro plays as full-screen beats, one idea per screen:
 * a world's first level opens with its chapter story, then every level
 * gets the rule card where the twist sentence owns the screen.
 */
import type { PlayLevel } from '@/lib/adventure/play/levels';

export type IntroBeat = 'chapter' | 'rule';

export function introBeats(lvl: Pick<PlayLevel, 'level'>): IntroBeat[] {
  return lvl.level === 1 ? ['chapter', 'rule'] : ['rule'];
}

const BACKDROP_SLUGS = ['meadows', 'springs', 'caverns', 'archipelago', 'canyon', 'labyrinth', 'palace', 'nebula', 'peaks', 'throne'];

/** Painted scene for a world (same set the play screen uses). */
export function worldBackdrop(world: number): string {
  const slug = BACKDROP_SLUGS[Math.min(Math.max(world, 1), 10) - 1];
  return `/images/adventure/backgrounds/${slug}.webp`;
}
