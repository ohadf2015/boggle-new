/**
 * Howler html5 looping is `_ended` → `play(id)`. For a Howl whose decoded
 * duration is 0 / NaN (truncated file, empty CDN 200, html5 metadata not
 * ready) that restart is SYNCHRONOUS, so `_ended → play → _ended` recurses
 * without bound (Sentry 1PP/1RZ). MusicContext's onload duration guard never
 * runs for SFX (fire-crackle) or for a Howl that plays before onload.
 *
 * A second html5 play() on an already-playing looping Howl also spawns a
 * NEW Audio element — that's the "sounds stacked on themselves" loop.
 */
import { describe, it, expect } from 'vitest';
import { ensureHowl } from '../audioLoader';

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';

describe('ensureHowl — html5 ended→play re-entry (SFX/music infinite loop)', () => {
  it('turns looping off when duration is 0 before play() starts', async () => {
    const Howl = await ensureHowl();
    const howl = new Howl({ src: [SILENT_WAV], html5: true, preload: false, loop: true, volume: 0 });
    (howl as unknown as { _state: string })._state = 'loaded';
    howl.duration = () => 0;

    expect(() => howl.play()).not.toThrow();
    expect(howl.loop()).toBe(false);
    howl.unload();
  });

  it('does not spawn a second instance when play() is called on an already-playing looping Howl', async () => {
    const Howl = await ensureHowl();
    const howl = new Howl({ src: [SILENT_WAV], html5: true, preload: false, loop: true, volume: 0 });
    const rig = howl as unknown as { _sounds: { _id: number }[]; _state: string };
    rig._state = 'loaded';
    rig._sounds = [{ _id: 42 }];
    howl.playing = () => true;
    howl.duration = () => 12;

    const id = howl.play();
    expect(id).toBe(42);
    expect(rig._sounds).toHaveLength(1);
    howl.unload();
  });
});
