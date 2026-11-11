import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ANIM_DIR = path.join(__dirname, '..', 'public', 'mascot', 'anim');
const MAX_BYTES = 300 * 1024;

interface AnimEntry {
  id: string;
  file: string;
  poster: string;
  durationMs: number;
  loop: boolean;
  beats: { windupMs: number; actionMs: number; holdMs: number };
  tags: string[];
}

const manifest: AnimEntry[] = JSON.parse(readFileSync(path.join(ANIM_DIR, 'manifest.json'), 'utf8'));
const toDisk = (publicPath: string) => path.join(ANIM_DIR, '..', '..', publicPath);

describe('mascot anim manifest', () => {
  it('has unique ids', () => {
    const ids = manifest.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(manifest.map((e) => [e.id, e] as const))('%s: clip and poster exist and stay under 300 KB', (_id, entry) => {
    for (const publicPath of [entry.file, entry.poster]) {
      const file = toDisk(publicPath);
      expect(existsSync(file), publicPath).toBe(true);
      expect(statSync(file).size, publicPath).toBeLessThan(MAX_BYTES);
    }
  });

  it.each(manifest.map((e) => [e.id, e] as const))('%s: beats fit inside the clip', (_id, entry) => {
    const { windupMs, actionMs, holdMs } = entry.beats;
    expect(entry.durationMs).toBeGreaterThan(0);
    expect(windupMs + actionMs + holdMs).toBeLessThanOrEqual(entry.durationMs);
  });

  it('lists every clip in the folder', () => {
    const listed = new Set(manifest.flatMap((e) => [path.basename(e.file), path.basename(e.poster)]));
    const onDisk = readdirSync(ANIM_DIR).filter((f) => f.endsWith('.webp'));
    expect(onDisk.filter((f) => !listed.has(f))).toEqual([]);
  });
});
