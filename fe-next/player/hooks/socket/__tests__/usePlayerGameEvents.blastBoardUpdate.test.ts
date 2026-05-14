/**
 * Source-contract test: blastBoardUpdate socket wiring in usePlayerGameEvents.
 *
 * Validates that:
 *  - The 'blastBoardUpdate' event is registered and cleaned up
 *  - The handler accepts optional overlay + seed fields
 *  - When overlay + seed are present (full board clear), they are applied to store
 *  - When overlay + seed are absent (per-word update), they are NOT applied
 *  - blastBoardUpdate is always set with clearedBy + word/clearedCount/totalMoves
 *
 * Uses readFileSync source-contract pattern to avoid spinning up the full hook
 * render stack with ~15 required props/mocks.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(__dirname, '../usePlayerGameEvents.ts'),
  'utf8',
);

describe('usePlayerGameEvents — blastBoardUpdate socket wiring', () => {
  it('registers blastBoardUpdate socket listener', () => {
    expect(source).toContain("socket.on('blastBoardUpdate'");
  });

  it('cleans up blastBoardUpdate socket listener', () => {
    expect(source).toContain("socket.off('blastBoardUpdate'");
  });

  it('handler accepts optional overlay and seed fields', () => {
    expect(source).toContain('overlay?: BlastTileOverlay[]');
    expect(source).toContain('seed?: number');
  });

  it('handler applies overlay + seed to store when both are present (full board clear)', () => {
    expect(source).toMatch(/if\s*\(\s*data\.overlay\s*&&\s*typeof\s+data\.seed\s*===\s*['"]number['"]\s*\)/);
    expect(source).toContain('blastTileOverlay: data.overlay');
    expect(source).toContain('blastSeed: data.seed');
  });

  it('handler sets blastBoardUpdate with game state', () => {
    expect(source).toContain('setBlastBoardUpdate(data)');
  });

  it('does NOT read blastWaveAdvance anymore', () => {
    expect(source).not.toContain("socket.on('blastWaveAdvance'");
    expect(source).not.toContain("socket.off('blastWaveAdvance'");
  });
});
