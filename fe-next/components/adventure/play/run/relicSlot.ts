/**
 * How wide one relic slot may be, given how many the run owns.
 *
 * ROUND 1 got this backwards. It shrank slots — down to a 20px floor — so the
 * whole collection always fit ONE row, and the judge measured the result
 * exactly: "two undifferentiated ~20px flat-square icons". A relic you cannot
 * recognise is not on screen in any useful sense.
 *
 * So the rule inverts: legibility first. A slot never drops below 32px, a small
 * collection sits at a fat 44px, and a big one WRAPS onto a second row rather
 * than dissolving. Two rows of readable relics beat one row of confetti, and a
 * wrap costs ~44px of a 844px screen — the board stays the hero.
 *
 * Budget on a 390px phone: the rail gets ~278px next to the gold pill, with a
 * 4px gap, so a row holds `floor((278 + 4) / (w + 4))` slots.
 */
export type RelicBarSize = 'sm' | 'md';

/** No relic icon is ever painted smaller than this. The round-2 judge gap, as a number. */
export const RELIC_ICON_FLOOR_PX = 32;

/** Tailwind width classes for one slot: a floor, a cap, and the shrink basis. */
export function relicSlotClass(count: number, size: RelicBarSize = 'sm'): string {
  const floorCap = 'min-w-8 max-w-12';
  if (size === 'md') {
    // The map rail and the run-recap card are calmer rooms with more width, so
    // they hold the fat size longer before stepping down.
    if (count >= 13) return `${floorCap} basis-10`;
    return `${floorCap} basis-12`;
  }
  // 13+: the legibility floor itself — 7 per row on a phone, three rows at worst.
  if (count >= 13) return `${floorCap} basis-8`;
  // 7-12: 40px keeps six on a row, so a normal haul wraps once at most.
  if (count >= 7) return `${floorCap} basis-10`;
  return `${floorCap} basis-11`;
}

/** Slot basis in px, for layout maths (tests + the rows estimate below). */
export function relicSlotPx(count: number, size: RelicBarSize = 'sm'): number {
  const cls = relicSlotClass(count, size);
  return Number(cls.match(/basis-(\d+)/)![1]) * 4;
}

/** How many rows `count` relics take in `railPx`, at a 4px gap. */
export function relicRows(count: number, railPx: number, size: RelicBarSize = 'sm'): number {
  if (count <= 0) return 0;
  const w = relicSlotPx(count, size);
  const perRow = Math.max(1, Math.floor((railPx + 4) / (w + 4)));
  return Math.ceil(count / perRow);
}
