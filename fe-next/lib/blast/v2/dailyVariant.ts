/**
 * Daily variant salt for the generator. Mixed into the level seed so the SAME
 * level number renders a DIFFERENT board each UTC day — replaying or revisiting
 * gets a fresh layout instead of the exact same puzzle.
 *
 * Curated/chain packs ignore this (hand-authored content is intentionally
 * stable); only `GeneratedLevelSource` consumes the salt.
 */

export function todayUtcVariant(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const SHAPE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isVariantShape(v: string): boolean {
  return SHAPE_RE.test(v);
}
