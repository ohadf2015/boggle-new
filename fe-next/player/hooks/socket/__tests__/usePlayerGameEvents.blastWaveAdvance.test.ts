/**
 * Source-contract test: blastWaveAdvance socket wiring in usePlayerGameEvents.
 *
 * Validates that:
 *  - The 'blastWaveAdvance' event is registered and cleaned up
 *  - The handler atomically updates all required store fields
 *  - blastMovesUsed is reset to 0 on wave advance (per-wave move counter)
 *  - blastBoardUpdate is set with '__wave_advance__' sentinel so BlastGame
 *    engine re-applies the board via the existing applyServerBoard path
 *
 * Uses readFileSync source-contract pattern (same as PlayerView.lifecycle.test.ts)
 * to avoid spinning up the full hook render stack with ~15 required props/mocks.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(__dirname, '../usePlayerGameEvents.ts'),
  'utf8',
);

describe('usePlayerGameEvents — blastWaveAdvance socket wiring', () => {
  it('registers blastWaveAdvance socket listener', () => {
    expect(source).toContain("socket.on('blastWaveAdvance'");
  });

  it('cleans up blastWaveAdvance socket listener', () => {
    expect(source).toContain("socket.off('blastWaveAdvance'");
  });

  it('handler updates blastWave in store', () => {
    expect(source).toContain('blastWave: data.wave');
  });

  it('handler resets blastMovesUsed to 0 on wave advance', () => {
    expect(source).toContain('blastMovesUsed: 0');
  });

  it('handler updates blastTileOverlay with new overlay', () => {
    expect(source).toContain('blastTileOverlay: data.overlay');
  });

  it('handler updates blastSeed for engine RNG sync', () => {
    expect(source).toContain('blastSeed: data.seed');
  });

  it('handler sets blastBoardUpdate with wave_advance sentinel', () => {
    expect(source).toContain("'__wave_advance__'");
  });
});
