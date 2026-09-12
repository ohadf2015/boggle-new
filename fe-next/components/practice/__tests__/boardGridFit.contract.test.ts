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
});
