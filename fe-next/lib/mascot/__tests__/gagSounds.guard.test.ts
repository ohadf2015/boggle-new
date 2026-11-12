import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { SOUND_EFFECTS, SOUND_PRIORITIES } from '@/lib/audio/soundEffectsConfig';
import { AUDIO_LOAD_PRIORITY } from '@/lib/audio/audioLoader';
import { GAG_SOUND_KEYS, gagSoundVolume } from '../gagSounds';

const manifest = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'public', 'sounds', 'mascot-gags', 'manifest.json'), 'utf8'),
) as { id: string; file: string; lufs: number }[];

describe('mascot gag sounds registration', () => {
  it('registers every manifest id as a sound effect pointing at its file', () => {
    for (const { id, file } of manifest) {
      const key = GAG_SOUND_KEYS[id as keyof typeof GAG_SOUND_KEYS];
      expect(key, `${id} has no sound key`).toBeDefined();
      expect(SOUND_EFFECTS[key]).toBe(file);
      expect(SOUND_PRIORITIES[key]).toBe(AUDIO_LOAD_PRIORITY.LOW);
    }
    expect(Object.keys(GAG_SOUND_KEYS).sort()).toEqual(manifest.map((s) => s.id).sort());
  });

  it('plays the sounds mastered quieter louder, within 0..1', () => {
    const vol = (id: string) => gagSoundVolume(GAG_SOUND_KEYS[id as keyof typeof GAG_SOUND_KEYS]);
    for (const { id } of manifest) {
      expect(vol(id)).toBeGreaterThan(0);
      expect(vol(id)).toBeLessThanOrEqual(1);
    }
    for (const quiet of ['crumple', 'slow-clap', 'faceplant-thud']) expect(vol(quiet)).toBeGreaterThan(vol('bonk'));
  });
});
