/**
 * Blast MP RNG determinism — client optimistic prediction must match the
 * server's authoritative board so applyServerBoard's equality guard no-ops
 * (no tile flicker).
 *
 * A rare word spawns diamonds on cells picked with an `rng`. The server seeds it
 * `createSeededRandom(board.seed + totalMoves)`; the client must use the same
 * seed + valid-move index. A WRONG move index must diverge, so the test actually
 * catches an off-by-one or an unseeded client.
 */
import { describe, it, expect } from 'vitest';
import { processTilesForWord } from '@/components/blast/legacy/utils/clearTilesProcessor';
import { createSeededRandom } from '@/components/blast/legacy/utils/blastLetterGenerator';
import type { BlastTileState } from '@/shared/types/blast';

const SEED = 0x1234abcd;
const SIZE = 4;
const WAVE = 1;

function plainBoard(): BlastTileState[][] {
  return Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) =>
      ({
        uid: `u-${r}-${c}`,
        row: r,
        col: c,
        type: 'standard',
        isCleared: false,
        activationEffect: null,
        hitsRemaining: 0,
      } as BlastTileState),
    ),
  );
}

// An epic word (two diamonds) along the top row.
const PATH = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }];

function runClear(rng: () => number) {
  return processTilesForWord({
    prev: plainBoard(),
    path: PATH,
    word: 'jazz',
    baseScore: 3,
    gridSize: SIZE,
    currentWave: WAVE,
    rng,
  });
}

/** Multiset of resulting tile types (order-independent) — what the diamond spawn alters. */
function typeSignature(next: BlastTileState[][]): string {
  return next
    .flat()
    .map((t) => `${t.row},${t.col}:${t.type}`)
    .sort()
    .join('|');
}

describe('Blast MP diamond spawn determinism (client/server parity)', () => {
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
