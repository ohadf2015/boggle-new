export type ComboTier = 0 | 1 | 2 | 3;

/** 0 = no meter, 1 = x2-3, 2 = x4-6 (glow), 3 = x7+ (shake + sparks). */
export function comboTier(combo: number): ComboTier {
  if (!Number.isFinite(combo) || combo < 2) return 0;
  if (combo < 4) return 1;
  if (combo < 7) return 2;
  return 3;
}

const COMPACT_FROM = 10_000;

/** Full digits under 10k, compact above, so a HUD chip never outgrows its slot. */
export function formatHudCount(n: number, locale?: string): string {
  const v = Math.max(0, Math.round(Number.isFinite(n) ? n : 0));
  if (v < COMPACT_FROM) return new Intl.NumberFormat(locale).format(v);
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}
