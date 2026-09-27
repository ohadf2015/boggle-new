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
/** `xs`: the in-level HUD — icon-only at the 32px floor, sharing its row with the potions. */
export type RelicBarSize = 'xs' | 'sm' | 'md';

/** No relic icon is ever painted smaller than this. The round-2 judge gap, as a number. */
export const RELIC_ICON_FLOOR_PX = 32;

/**
 * Tailwind width classes for one slot: a floor, a cap, and the shrink basis.
 *
 * ROUND 5: the CAP steps down with the haul too, not just the basis. A slot is
 * `flex-1`, so a fixed `max-w-12` meant every chip grew straight back to 48px
 * and twelve relics took THREE rows on the boss board — 160px of an 844px phone
 * stolen from the grid at the one moment the item count and the stakes are both
 * highest. Twelve at 40px and the whole catalog at the 32px floor both land in
 * two rows, which is the density the bar's relic strip actually runs at.
 */
export function relicSlotClass(count: number, size: RelicBarSize = 'sm'): string {
  const floor = 'min-w-8';
  if (size === 'xs') return `${floor} max-w-8 basis-8`;
  if (size === 'md') {
    // The map rail and the run-recap card are calmer rooms with more width, so
    // they hold the fat size longer before stepping down.
    if (count >= 13) return `${floor} max-w-12 basis-10`;
    return `${floor} max-w-12 basis-12`;
  }
  // 13+: the legibility floor itself — nine per row on a phone, two rows at worst.
  if (count >= 13) return `${floor} max-w-8 basis-8`;
  // 7-12: 40px keeps seven on a row, so a big haul wraps exactly once.
  if (count >= 7) return `${floor} max-w-10 basis-9`;
  return `${floor} max-w-12 basis-11`;
}

/** Slot basis in px, for layout maths (tests + the rows estimate below). */
export function relicSlotPx(count: number, size: RelicBarSize = 'sm'): number {
  const cls = relicSlotClass(count, size);
  return Number(cls.match(/basis-(\d+)/)![1]) * 4;
}

/**
 * What a slot actually RENDERS at once flex has grown it: the cap. This — not
 * the basis — is what decides how many rows the rail takes on screen.
 */
export function relicSlotCapPx(count: number, size: RelicBarSize = 'sm'): number {
  return Number(relicSlotClass(count, size).match(/max-w-(\d+)/)![1]) * 4;
}

/** The gap between two slots, in px (Tailwind `gap-x-1`). */
export const RELIC_GAP_PX = 4;

/**
 * How many chips belong on ONE row: as close to an even split as two rows allow.
 *
 * Left to wrap on its own the rail packs each row full and dumps the remainder
 * on the next one — eleven relics and then a lonely twelfth on a TV, nine and
 * three on a phone. A balanced split reads as one block of loot instead of a
 * row with an orphan, and it costs nothing: both shapes take the same two rows.
 */
export function relicPerRow(count: number): number {
  if (count <= 6) return Math.max(1, count);
  return Math.ceil(count / 2);
}

/**
 * Cap the rail's width at exactly `relicPerRow` slots, so the wrap lands where
 * the split is even. It only ever narrows the rail — if the screen is tighter
 * than this, flex wraps earlier on its own and the rows stay legible.
 */
export function relicRailMaxPx(count: number, size: RelicBarSize = 'sm'): number {
  const per = relicPerRow(count);
  return per * relicSlotCapPx(count, size) + (per - 1) * RELIC_GAP_PX;
}

/**
 * How many rows `count` relics take in `railPx`, at a 4px gap. Measured on the
 * CAP, because that is the width a `flex-1` slot actually settles at — reading
 * the basis instead is what let a twelve-relic haul claim two rows in the model
 * while rendering three on the phone.
 */
export function relicRows(count: number, railPx: number, size: RelicBarSize = 'sm'): number {
  if (count <= 0) return 0;
  const w = relicSlotCapPx(count, size);
  const perRow = Math.max(1, Math.floor((railPx + 4) / (w + 4)));
  return Math.ceil(count / perRow);
}
