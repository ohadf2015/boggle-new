import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

interface GagSound {
  id: string;
  file: string;
  durationMs: number;
  lufs: number;
}

const PUBLIC_DIR = join(__dirname, '..', '..', '..', 'public');
const GAGS_DIR = join(PUBLIC_DIR, 'sounds', 'mascot-gags');
const MAX_BYTES = 60 * 1024;

const readManifest = (): GagSound[] =>
  JSON.parse(readFileSync(join(GAGS_DIR, 'manifest.json'), 'utf8')) as GagSound[];

describe('mascot gag sounds manifest', () => {
  it('lists unique ids with a duration and loudness', () => {
    const manifest = readManifest();
    expect(manifest.length).toBeGreaterThan(0);
    expect(new Set(manifest.map((s) => s.id)).size).toBe(manifest.length);
    for (const s of manifest) {
      expect(s.file).toBe(`/sounds/mascot-gags/${s.id}.mp3`);
      expect(s.durationMs).toBeGreaterThan(0);
      expect(Number.isFinite(s.lufs)).toBe(true);
    }
  });

  it('points every entry at an mp3 under 60 KB', () => {
    for (const s of readManifest()) {
      const path = join(PUBLIC_DIR, s.file);
      expect(existsSync(path), `${s.file} missing`).toBe(true);
      expect(statSync(path).size, `${s.file} too big`).toBeLessThan(MAX_BYTES);
    }
  });
});
