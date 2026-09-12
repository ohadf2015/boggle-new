/**
 * Board-grid fit contract (regression: 6th grid row clipped on 390x844).
 *
 * The letter grids in SoloPracticeBoard and WarmupRound used to size
 * themselves with a magic constant (`calc(100vh-400px)`) guessing the
 * surrounding chrome. On a 390x844 phone the column of header + word
 * forming + grid + found words exceeded the drill's fixed viewport and the
 * overflow-hidden root clipped the grid's last row — no page scroll, but
 * the bottom letters were unreachable.
 *
 * The grid must instead measure its actual container and render the largest
 * square that fits BOTH axes.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) =>
  readFileSync(resolve(__dirname, '..', rel), 'utf8');

describe('letter-grid fit — no magic viewport constants', () => {
  it.each([
    ['SoloPracticeBoard.tsx', 'SoloPracticeBoard'],
    ['WarmupRound.tsx', 'WarmupRound'],
  ])('%s measures its container instead of guessing chrome height', (file, name) => {
    const source = read(file);
    expect(source).not.toMatch(/calc\(100vh-/);
    expect(source).toContain('useContainerDimensions');
    expect(source).toMatch(/flex-1 min-h-0/);
  });

  // The measured grid only works when the drill root is a flex column with a
  // definite height: `flex-1` on the grid wrapper resolves against it. A
  // `min-h-full` block root leaves the wrapper at auto height (0), the
  // measurement never validates, and the board renders NOTHING. This
  // regressed on master when a parallel branch rewrote SoloPracticeBoard's
  // root while the grid hunk came from the measured-square fix (merge
  // d6461f4a8, caught by production dogfood 2026-09-12: empty board).
  it.each([
    ['SoloPracticeBoard.tsx', 'SoloPracticeBoard'],
    ['WarmupRound.tsx', 'WarmupRound'],
  ])('%s drill root is a full-height flex column (grid flex-1 has a real area)', (file, name) => {
    const source = read(file);
    expect(source).toMatch(/DRILL_ROOT_CLASS/);
    expect(source).not.toMatch(/min-h-full bg-neo-navy/);
  });
});
