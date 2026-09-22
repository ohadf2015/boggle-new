/**
 * Howler HTML5 sound listeners must not throw once their Sound has been unloaded.
 *
 * Regression (Sentry JAVASCRIPT-NEXTJS-25R + PostHog t_c3fc4a61):
 * - `Howl.unload()` deletes `sound._node`, but a `canplaythrough` listener can
 *   still reach `Sound._loadListener`, which reads `this._node.duration`.
 * - `Howl.unload()` itself calls `sound._node.removeEventListener` without a
 *   null check → "Cannot read properties of undefined (reading 'removeEventListener')".
 */
import { describe, it, expect } from 'vitest';
import { ensureHowl } from '../audioLoader';

type SoundProto = Record<
  '_loadListener' | '_endListener' | '_errorListener',
  (this: unknown) => unknown
>;

describe('ensureHowl — stale Sound listeners (t_c3fc4a61)', () => {
  it.each(['_loadListener', '_endListener', '_errorListener'] as const)(
    '%s is a no-op on a Sound whose node was unloaded',
    async (name) => {
      await ensureHowl();
      const Sound = (globalThis as unknown as { Sound?: { prototype: SoundProto } }).Sound;
      expect(Sound).toBeDefined();

      const unloaded = {
        _parent: { _sprite: {}, _state: 'unloaded', _emit() {}, _loadQueue() {} },
      };
      expect(() => Sound!.prototype[name].call(unloaded)).not.toThrow();
    }
  );

  it('Howl.unload() does not throw when a sound._node was already cleared', async () => {
    const Howl = await ensureHowl();
    const howl = new Howl({
      src: [
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=',
      ],
      html5: true,
      preload: true,
      volume: 0,
    });
    const bag = howl as unknown as {
      _sounds: { _node?: unknown; _id?: number; _ended?: boolean; _paused?: boolean }[];
    };
    if (!bag._sounds || bag._sounds.length === 0) {
      bag._sounds = [{ _id: 1, _ended: true, _paused: true, _node: undefined }];
    } else {
      for (const s of bag._sounds) s._node = undefined;
    }
    expect(() => howl.unload()).not.toThrow();
  });
});
