/**
 * De-rounded Blast milestones.
 *
 * Round milestone numbers (100, 250, 500, 1000…) read as "a developer programmed
 * this". We jitter the TRIGGER thresholds off the round values once per game
 * (seeded → deterministic within a run) so the celebration moments land at
 * organic scores. The milestone pill then shows the player's real running score,
 * which is itself organic thanks to letter-value + treasure-roll bonuses.
 */
import { createSeededRandom } from '@/lib/adventure/gridRandom';

/** Canonical milestone tiers (still the tier anchors for icon/colour lookup). */
export const BLAST_MILESTONE_BASES = [100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000] as const;

/**
 * Per-game jittered trigger thresholds. Each base is nudged within a small band
 * (±max(18, 7% of base)) and clamped to stay strictly increasing and safely
 * below the next base, so tiers never cross.
 */
export function jitterMilestones(seed: number): number[] {
  const rng = createSeededRandom(seed | 0);
  const out: number[] = [];
  for (let i = 0; i < BLAST_MILESTONE_BASES.length; i++) {
    const base = BLAST_MILESTONE_BASES[i];
    const band = Math.max(18, Math.round(base * 0.07));
    // offset in [-band, +band]
    const offset = Math.round((rng() * 2 - 1) * band);
    let value = base + offset;
    // strictly above previous threshold
    if (i > 0) value = Math.max(value, out[i - 1] + 5);
    // safely below the next base so tiers stay ordered
    const next = BLAST_MILESTONE_BASES[i + 1];
    if (next != null) value = Math.min(value, next - 5);
    out.push(Math.max(1, value));
  }
  return out;
}
