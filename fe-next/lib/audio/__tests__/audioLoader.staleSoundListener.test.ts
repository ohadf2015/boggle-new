/**
 * Howler HTML5 sound listeners must not throw once their Sound has been unloaded.
 *
 * Regression (Sentry JAVASCRIPT-NEXTJS-25R, 1,849 events from one multiplayer
 * tab): `Howl.unload()` deletes `sound._node`, but a `canplaythrough` listener
 * can still reach `Sound._loadListener`, which reads `this._node.duration` and
 * throws "Cannot read properties of undefined (reading 'duration')" on every
 * canplaythrough of the pooled <audio> element.
 */
import { describe, it, expect } from 'vitest';
import { ensureHowl } from '../audioLoader';

type SoundProto = Record<'_loadListener' | '_endListener' | '_errorListener', (this: unknown) => unknown>;

describe('ensureHowl — stale Sound listeners', () => {
  it.each(['_loadListener', '_endListener', '_errorListener'] as const)(
    '%s is a no-op on a Sound whose node was unloaded',
    async (name) => {
      await ensureHowl();
      const Sound = (globalThis as unknown as { Sound?: { prototype: SoundProto } }).Sound;
      expect(Sound).toBeDefined();

      const unloaded = { _parent: { _sprite: {}, _state: 'unloaded', _emit() {}, _loadQueue() {} } };
      expect(() => Sound!.prototype[name].call(unloaded)).not.toThrow();
    }
  );
});
