import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * Contract: a `container-type: size` element only reports a non-zero block size
 * (`cqh`/`cqb`) when EVERY ancestor up to the viewport has a *definite* height.
 *
 * A shell root of `min-h-[100dvh]` (or `min-h-screen`) is content-driven, not
 * definite. `flex-1 min-h-0` under it never resolves, so `cqh`/`cqb` compute to
 * 0px, `min(100cqw, 94cqh)` collapses to 0, the board wrapper gets width:0 —
 * and the inner `.game-board-frame` falls back to its own viewport math and
 * renders as a tall rectangle spilling out of a zero-width box.
 *
 * That was the single-player portrait bug (measured in Chrome at 384x832:
 * `100cqw` -> 336px but `94cqh` -> 0px). This guard keeps every shell that owns
 * a size container on a definite-height root.
 *
 * The file list is DERIVED, not hardcoded — the next instance of this bug will
 * be in whichever shell nobody thought to list.
 *
 * jsdom drops `min()` and container-query units, so a rendering assertion would
 * pass whether or not the bug exists. Hence a source contract; the behaviour
 * itself was verified in a real browser.
 */

const ROOTS = ['components', 'app'];
const DECLARES_SIZE_CONTAINER = /container-type:\s*size|containerType:\s*'size'/;
// `]` is not a word character, so no trailing \b here — it would never match.
const INDEFINITE_ROOT = /min-h-(\[100dvh\]|\[100vh\]|screen)/;

/**
 * Files where an indefinite-height root is a *sibling* early-return branch (a
 * centered "waiting…" or loading screen with no size container inside it),
 * never an ancestor of the size container. Verified by reading each one.
 */
const ALLOWED: Record<string, string> = {
  'components/multiplayer/crossword/CrosswordVersus.tsx':
    'the min-h root is the `if (!mp.puzzle)` waiting screen; the play surface is CrosswordRace',
  'app/[locale]/quick-play/PageClient.tsx':
    'min-h-screen is the childless Suspense fallback; the real shell is flex min-h-0 flex-1 (see its comment — this exact collapse was already fixed here)',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const cwd = process.cwd();
const shells = ROOTS.flatMap((r) => walk(join(cwd, r)))
  .filter((f) => DECLARES_SIZE_CONTAINER.test(readFileSync(f, 'utf8')))
  .map((f) => relative(cwd, f))
  .sort();

describe('game shell sizing contract', () => {
  it('finds the shells that declare size containers', () => {
    // If this hits zero the scan silently stopped guarding anything.
    expect(shells.length).toBeGreaterThan(5);
  });

  it('no shell with a size container roots on an indefinite height', () => {
    const offenders = shells
      .filter((rel) => INDEFINITE_ROOT.test(readFileSync(join(cwd, rel), 'utf8')))
      .filter((rel) => !(rel in ALLOWED));

    expect(
      offenders,
      'These declare a size container AND an indefinite-height root. cqh/cqb ' +
        'resolve to 0px under one, collapsing the board wrapper. Use a definite ' +
        'height (h-[100dvh], or flex-1 min-h-0 under a parent that has one). If ' +
        'the indefinite root is a sibling loading branch, add it to ALLOWED with ' +
        'a reason.',
    ).toEqual([]);
  });

  it('every ALLOWED entry still declares a size container', () => {
    // Stops the allowlist rotting into a permanent exemption after a refactor.
    expect(Object.keys(ALLOWED).filter((rel) => !shells.includes(rel))).toEqual([]);
  });
});
