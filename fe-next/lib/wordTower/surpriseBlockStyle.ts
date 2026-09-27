/**
 * Word Tower — surprise-block visual style (pure, renderer-agnostic).
 *
 * When a variable-reward surprise fires on a word (see towerSurprise.ts), the
 * floor it places is tagged with the event. This maps that event to a bold
 * signature colour so the block reads as a distinct landmark in the tower — a
 * gold jackpot floor, an icy crystal, a fiery meteor — turning a fleeting "nice
 * pop!" into a permanent, visible mark of your best moments.
 *
 * Purely cosmetic: never touches height/score, so leaderboard integrity holds.
 * Colours deliberately sit apart from the golden-angle word palette + biome
 * grading (the caller renders these UNGRADED) so a surprise floor always pops
 * against its neighbours regardless of altitude.
 */
import type { TowerSurpriseEvent } from './towerSurprise';

/** Packed 24-bit RGB signature colour per surprise event. */
export const SURPRISE_BLOCK_COLOR: Record<TowerSurpriseEvent, number> = {
  surge: 0x00e5ff, // electric cyan — the everyday spark
  windfall: 0xbfff00, // lime — the free-scramble gift
  updraft: 0x7fd4ff, // pale sky — lift
  crystal: 0x9be7ff, // icy gem
  echo: 0xb388ff, // violet ripple
  meteor_strike: 0xff6b35, // molten orange
  phantom_floor: 0xc9d1ff, // ghost pale-indigo
  golden_floor: 0xffd54a, // jackpot gold
};

/** Whether a fired event should visually stand out as a surprise block. All
 *  current events do; kept as a helper so callers read intent, not a map lookup. */
export function isSurpriseBlock(event: TowerSurpriseEvent | undefined): event is TowerSurpriseEvent {
  return event != null && event in SURPRISE_BLOCK_COLOR;
}

/** Signature colour for a surprise block, or null when the floor is ordinary. */
export function surpriseBlockColor(event: TowerSurpriseEvent | undefined): number | null {
  return isSurpriseBlock(event) ? SURPRISE_BLOCK_COLOR[event] : null;
}
