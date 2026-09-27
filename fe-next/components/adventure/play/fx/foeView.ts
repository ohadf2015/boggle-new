/**
 * The foe on normal (non-combat) levels: the level's score race drawn as damage.
 * HP = the top-star score, every point scored is a point of damage, and the bar is
 * chunky pips that empty in quarters (Bookworm's quartered hearts). Pure.
 */

export const FOE_PIPS = 8;

export interface FoeView {
  max: number;
  hp: number;
  /** Per pip 0..1 in quarter steps (ceil: a pip with any HP left shows at least a quarter). */
  pips: number[];
  /** Each star threshold: `at` = bar position (0..1 from the start) where that much damage lands. */
  marks: Array<{ at: number; earned: boolean }>;
  defeated: boolean;
}

export function foeView(score: number, stars: readonly number[]): FoeView {
  const max = Math.max(1, stars[stars.length - 1] ?? 0);
  const hp = Math.max(0, max - Math.max(0, score));
  const per = max / FOE_PIPS;
  const pips = Array.from({ length: FOE_PIPS }, (_, i) => {
    const fill = Math.min(1, Math.max(0, (hp - i * per) / per));
    return Math.ceil(fill * 4 - 1e-9) / 4;
  });
  const marks = stars.map((s) => ({ at: Math.max(0, (max - s) / max), earned: s > 0 && score >= s }));
  return { max, hp, pips, marks, defeated: hp === 0 };
}
