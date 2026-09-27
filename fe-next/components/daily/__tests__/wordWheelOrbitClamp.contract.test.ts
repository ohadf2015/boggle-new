import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Contract: the wheel orbit may never be allowed to exceed its container's
 * block size.
 *
 * The orbit is `shrink-0` inside the `flex-1 min-h-0` wheel cluster, so flexbox
 * cannot shrink it — its own max-w/max-h caps are the ONLY thing keeping it
 * inside the cluster. Those caps were written `max(176px, calc(100cqb - 116px))`,
 * and that 176px floor wins whenever the container is smaller than the floor.
 *
 * That happens for real on Android with an anchored AdMob banner: the banner
 * feeds `--bottom-stack-height`, the cluster is squeezed to ~126px, the orbit
 * floors at 176px, and the cluster's content overflows its box by ~64px — the
 * Submit button lands ON TOP of the found-words chips (measured 60px of
 * overlap) and the board is crushed into the top of the screen.
 *
 * Wrapping each cap in `min(100cqb, …)` keeps every existing size on normal
 * viewports (where 100cqb is the largest term) and clamps to the container only
 * when space is genuinely scarce.
 *
 * jsdom drops `min()`/`max()` and container-query units, so a rendering
 * assertion here would pass either way. This is a source contract; the fix was
 * verified in a real browser with the banner CSS vars simulated.
 */

const FILE = 'components/daily/WordWheelGame.tsx';
const CHALLENGE = 'components/daily/WordWheelChallenge.tsx';

describe('word wheel orbit clamp', () => {
  const source = readFileSync(join(process.cwd(), FILE), 'utf8');

  const orbitLine = source
    .split('\n')
    .find((l) => l.includes('aspect-square') && l.includes('cqb'));

  it('the orbit sizing line is still findable', () => {
    expect(orbitLine, `no aspect-square + cqb line in ${FILE}`).toBeTruthy();
  });

  it('every cqb-based cap is bounded by the container block size', () => {
    // Each `max-w-[…]` / `max-h-[…]` that mentions cqb must be wrapped so the
    // container size is an upper bound — otherwise a px floor can exceed it.
    const caps = (orbitLine ?? '').match(/max-[wh]-\[[^\]]*cqb[^\]]*\]/g) ?? [];
    expect(caps.length, 'expected cqb-based max-w/max-h caps on the orbit').toBeGreaterThan(0);

    const unbounded = caps.filter((c) => !c.includes('min(100cqb,'));
    expect(
      unbounded,
      'These caps can exceed their container: a `max(<px>, …)` floor wins when ' +
        'the cluster is smaller than the floor (real case: Android AdMob banner ' +
        'squeezes the cluster to ~126px, orbit floors at 176px, Submit overlaps ' +
        'the found-words chips). Wrap the cap in min(100cqb, …).',
    ).toEqual([]);
  });
});

/**
 * Contract: `--bottom-stack-height` is reserved exactly ONCE per screen.
 *
 * `body.screen-fit` / `body.screen-fit-locked` already apply
 * `padding-bottom: var(--bottom-stack-height)` (globals.css). `pb-bottom-stack`
 * on a descendant reserves it a SECOND time, and on a nested descendant a third
 * — padding is additive, not idempotent. The word wheel had all three, so on
 * Android with an AdMob banner (154px stack) the layout lost 3 x 154 = 462px of
 * an 832px viewport: content ended at y=370 with a huge dead band beneath it,
 * and the squeezed cluster pushed Submit onto the found-words chips.
 *
 * A "defence in depth" padding is a bug, not a safety net.
 */
describe('bottom stack is reserved once', () => {
  const fail =
    'body.screen-fit-locked already reserves --bottom-stack-height; adding ' +
    'pb-bottom-stack in the playing chain reserves it again. Measured: 3 layers ' +
    'x 154px = 462px lost from an 832px viewport.';

  it('WordWheelGame renders wholly inside the locked body, so it never re-reserves', () => {
    const src = readFileSync(join(process.cwd(), FILE), 'utf8');
    const offenders = src
      .split('\n')
      .map((line, i) => `${i + 1}: ${line.trim().slice(0, 70)}`)
      .filter((l) => /\bpb-bottom-stack\b/.test(l));
    expect(offenders, fail).toEqual([]);
  });

  it("WordWheelChallenge's phase==='playing' wrapper does not re-reserve", () => {
    const src = readFileSync(join(process.cwd(), CHALLENGE), 'utf8');
    // The playing wrapper is the one that lays the board out (justify-start +
    // pt-3). The ready and results phases are separate branches, left alone.
    const playing = src
      .split('\n')
      .filter((l) => l.includes('justify-start') && l.includes('pt-3'));
    expect(playing.length, 'playing wrapper not found — selector rotted').toBeGreaterThan(0);
    expect(playing.filter((l) => /\bpb-bottom-stack\b/.test(l)), fail).toEqual([]);
  });
});
