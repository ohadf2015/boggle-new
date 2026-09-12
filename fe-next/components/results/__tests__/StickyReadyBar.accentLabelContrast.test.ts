import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Labels on an accent fill are BLACK.
 *
 * Measured on the student round-end recap at 390x844 (2026-09-12): the REMATCH
 * button renders white on `bg-neo-pink` (#FF1493) at 3.64:1 — below the 4.5:1
 * AA threshold, and it is the primary action on the screen every child looks at
 * when the round ends. Black on the same fill is 5.77:1. The sibling lime
 * buttons in this very file already use `text-neo-black`; the pink ones were
 * the outliers.
 *
 * Asserted over the source rather than a render because the pairing is what is
 * wrong, and the pairing is spread across three branches (countdown, revenge,
 * ready) that a single render cannot reach at once.
 */
describe('StickyReadyBar — accent-fill labels', () => {
  it('never pairs a white label with the pink accent fill', () => {
    const source = readFileSync(
      join(process.cwd(), 'components/results/StickyReadyBar.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/bg-neo-pink\s+text-white/);
  });
});
