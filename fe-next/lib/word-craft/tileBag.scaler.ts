import { BLANK_LETTER } from './tileBag';

/**
 * Scale a distribution to a target tile count using largest-remainder.
 * Preserves blanks unchanged. Floors every other letter at 1.
 *
 * Algorithm:
 *  1. Reserve blanks (unchanged).
 *  2. For non-blank letters, compute proportional float allocation.
 *  3. Floor each to integer >= 1.
 *  4. Distribute leftover (target - sum) to letters with largest fractional part.
 *  5. If overshooting target, subtract from largest-count letters first (never below 1).
 */
export function scaleDistribution(
  full: Readonly<Record<string, number>>,
  target: number,
): Record<string, number> {
  const blanks = full[BLANK_LETTER] ?? 0;
  const targetNonBlank = target - blanks;
  const fullEntries = Object.entries(full).filter(([k]) => k !== BLANK_LETTER);
  const fullNonBlankSum = fullEntries.reduce((s, [, v]) => s + v, 0);

  if (fullNonBlankSum === 0) {
    return { ...full };
  }

  // If target equals full size, no-op.
  if (target === fullNonBlankSum + blanks) {
    return { ...full };
  }

  const ratio = targetNonBlank / fullNonBlankSum;

  type Slot = { letter: string; floor: number; frac: number };
  const slots: Slot[] = fullEntries.map(([letter, count]) => {
    const raw = count * ratio;
    const floor = Math.max(1, Math.floor(raw));
    return { letter, floor, frac: raw - Math.floor(raw) };
  });

  let sum = slots.reduce((s, x) => s + x.floor, 0);

  // Distribute extra units to largest fractional parts.
  if (sum < targetNonBlank) {
    const sortedByFrac = [...slots].sort((a, b) => b.frac - a.frac);
    let remaining = targetNonBlank - sum;
    let i = 0;
    while (remaining > 0) {
      sortedByFrac[i % sortedByFrac.length].floor += 1;
      remaining -= 1;
      i += 1;
    }
  }

  // Trim excess (rare; can happen when floor=1 forces sum > target).
  if (sum > targetNonBlank) {
    const sortedByCount = [...slots].sort((a, b) => b.floor - a.floor);
    let excess = sum - targetNonBlank;
    let i = 0;
    while (excess > 0) {
      const slot = sortedByCount[i % sortedByCount.length];
      if (slot.floor > 1) {
        slot.floor -= 1;
        excess -= 1;
      }
      i += 1;
      if (i > slots.length * 50) break;  // safety
    }
  }

  const result: Record<string, number> = {};
  for (const slot of slots) result[slot.letter] = slot.floor;
  if (blanks > 0) result[BLANK_LETTER] = blanks;
  return result;
}
