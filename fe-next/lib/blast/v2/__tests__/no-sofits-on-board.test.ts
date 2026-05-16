import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { ChainPackSource } from '../chain-pack-source';
import { HEBREW_REGULAR_TO_FINAL } from '@/shared/utils/wordNormalization';

const SOFIT_CHARS = new Set(Object.values(HEBREW_REGULAR_TO_FINAL));
const basePath = resolve(process.cwd(), 'content/blast/packs');

describe('blast v2 — no Hebrew sofit letters land on the board', () => {
  it('every Hebrew chain level 1-30 has zero sofits in tile state', async () => {
    const source = new ChainPackSource(basePath);
    for (let n = 1; n <= 30; n++) {
      const level = await source.resolve(n, 'he');
      for (const col of level.columns) {
        for (const tile of col.tiles) {
          expect(
            SOFIT_CHARS.has(tile),
            `level ${n}: sofit '${tile}' appeared on board — must be base form (rendered via displayChar)`,
          ).toBe(false);
        }
      }
    }
  }, 180_000);
});
