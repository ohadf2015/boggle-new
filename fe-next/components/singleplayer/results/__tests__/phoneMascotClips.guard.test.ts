import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { PHONE_MASCOT_CLIPS } from '../phoneMascotClips';

const manifest: Array<{ id: string; file: string; durationMs: number; loop: boolean; beats: { windupMs: number; actionMs: number } }> =
  JSON.parse(readFileSync(join(process.cwd(), 'public/mascot/anim/manifest.json'), 'utf8'));

describe('phone mascot clips', () => {
  it.each(Object.entries(PHONE_MASCOT_CLIPS))('Given the %s clip, Then its file, duration and freeze beat match the manifest', (_beat, clip) => {
    const entry = manifest.find((e) => e.file === clip.src);
    expect(entry).toBeDefined();
    expect(entry!.loop).toBe(false);
    expect(clip.durationMs).toBe(entry!.durationMs);
    expect(clip.freezeMs).toBe(entry!.beats.windupMs + entry!.beats.actionMs);
  });
});
