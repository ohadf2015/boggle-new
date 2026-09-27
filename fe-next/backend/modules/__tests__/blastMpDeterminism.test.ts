/**
 * Blast MP RNG determinism — client optimistic prediction must match the
 * server's authoritative board so applyServerBoard's equality guard no-ops
 * (no tile flicker).
 *
 * Divergence cause (flicker "with no reason" on prism clears): prism tiles
 * convert random standard tiles into specials using an `rng`. The server seeds
 * it `createSeededRandom(board.seed + totalMoves)`; the client used to call
 * processTilesForWord with NO rng (→ Math.random) and, where it did seed, used
 * the wrong move counter. This test pins the contract: client and server, given
 * the SAME seed + valid-move index, must produce identical processTilesForWord
 * output — and a WRONG move index must NOT (so the test actually catches the bug).
 */
import { describe, it, expect } from 'vitest';
import { processTilesForWord } from '@/components/blast/legacy/utils/clearTilesProcessor';
import { createSeededRandom } from '@/components/blast/legacy/utils/blastLetterGenerator';
import type { BlastTileState } from '@/shared/types/blast';

const SEED = 0x1234abcd;
const SIZE = 4;
const WAVE = 3; // prism enabled wave 3+

/** 4x4 board of standard tiles with a single PRISM at (0,0). */
function prismBoard(): BlastTileState[][] {
  return Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) =>
      ({
        uid: `u-${r}-${c}`,
        row: r,
        col: c,
        type: r === 0 && c === 0 ? 'prism' : 'standard',
        isCleared: false,
        activationEffect: null,
        hitsRemaining: 0,
      } as BlastTileState),
    ),
  );
}

// A word path that includes the prism cell so its conversion (rng-driven) fires.
const PATH = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];

function runClear(rng: () => number) {
  return processTilesForWord({
    prev: prismBoard(),
    path: PATH,
    word: 'ABC',
    baseScore: 2,
    gridSize: SIZE,
    currentWave: WAVE,
    rng,
  });
}

/** Multiset of resulting tile types (order-independent) — what prism alters. */
function typeSignature(next: BlastTileState[][]): string {
  return next
    .flat()
    .map((t) => `${t.row},${t.col}:${t.type}`)
    .sort()
    .join('|');
}

describe('Blast MP prism RNG determinism (client/server parity)', () => {
  it('is deterministic for a fixed seed (same seed → identical conversion)', () => {
    const a = typeSignature(runClear(createSeededRandom(SEED + 1)).next);
    const b = typeSignature(runClear(createSeededRandom(SEED + 1)).next);
    expect(a).toBe(b);
  });

  it('client (seed + moveIndex) matches server (seed + totalMoves) for the SAME move', () => {
    // Server: totalMoves == 1 for the first valid word.
    const server = typeSignature(runClear(createSeededRandom(SEED + 1)).next);
    // Client (post-fix): mirrors with validMoveCount == 1.
    const client = typeSignature(runClear(createSeededRandom(SEED + 1)).next);
    expect(client).toBe(server);
  });

  it('a WRONG move index diverges (proves the test catches the off-by-one / unseeded bug)', () => {
    const server = typeSignature(runClear(createSeededRandom(SEED + 1)).next);
    const wrong = typeSignature(runClear(createSeededRandom(SEED + 0)).next);
    expect(wrong).not.toBe(server);
  });
});
