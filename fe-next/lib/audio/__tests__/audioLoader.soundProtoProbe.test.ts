/**
 * When Howler's UMD global (`globalThis.Sound`) is unavailable — webpack-5
 * browser bundles define neither `global` nor evaluate the `window` branch
 * when scope-hoisted — resolveHowlerSoundPrototype must fall back to probing
 * a disposable Howl. The probe must actually LOAD the Howl: Howler constructs
 * internal Sound objects lazily inside load()/play(), and only after a codec
 * gate — so a preload:false probe that never calls load() has an empty
 * `_sounds` array and the stale-listener patch silently never applies
 * (production kept throwing in _loadListener/_endListener/_errorListener).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { resolveHowlerSoundPrototype } from '../audioLoader';

describe('resolveHowlerSoundPrototype — probe fallback', () => {
  const originalSound = (globalThis as { Sound?: unknown }).Sound;

  afterEach(() => {
    if (originalSound) (globalThis as { Sound?: unknown }).Sound = originalSound;
  });

  function buildFakeModule() {
    class FakeSound {}
    const soundProto = FakeSound.prototype as Record<string, unknown>;
    soundProto._loadListener = function () {};
    soundProto._endListener = function () {};
    soundProto._errorListener = function () {};

    const calls = { load: 0, unload: 0, codecsDuringLoad: false as boolean | null };
    const fakeHowler = { codecs: (_ext: string) => false };

    class FakeHowl {
      _sounds: unknown[] = [];
      constructor(public opts: unknown) {}
      load() {
        calls.load++;
        calls.codecsDuringLoad = fakeHowler.codecs('wav');
        // Howler constructs Sound synchronously inside load().
        this._sounds.push(new FakeSound());
      }
      unload() {
        calls.unload++;
      }
    }

    return { mod: { Howl: FakeHowl, Howler: fakeHowler }, calls, soundProto, fakeHowler };
  }

  it('probes a disposable Howl and returns the Sound prototype when the UMD global is missing', () => {
    delete (globalThis as { Sound?: unknown }).Sound;
    const { mod, calls, soundProto } = buildFakeModule();

    const proto = resolveHowlerSoundPrototype(mod as never);

    expect(calls.load).toBe(1);
    expect(proto).toBe(soundProto);
    expect(calls.unload).toBe(1);
  });

  it('forces the codec gate during the probe load and restores it after', () => {
    delete (globalThis as { Sound?: unknown }).Sound;
    const { mod, calls, fakeHowler } = buildFakeModule();

    resolveHowlerSoundPrototype(mod as never);

    expect(calls.codecsDuringLoad).toBe(true);
    expect(fakeHowler.codecs('wav')).toBe(false);
  });

  it('prefers the UMD global and never probes when it exists', () => {
    const globalProto = { _loadListener() {} };
    (globalThis as { Sound?: unknown }).Sound = { prototype: globalProto };
    const { mod, calls } = buildFakeModule();

    const proto = resolveHowlerSoundPrototype(mod as never);

    expect(proto).toBe(globalProto);
    expect(calls.load).toBe(0);
  });

  it('returns null instead of throwing when the probe cannot build a Sound', () => {
    delete (globalThis as { Sound?: unknown }).Sound;
    class BrokenHowl {
      load() {
        throw new Error('no audio');
      }
      unload() {}
    }
    const mod = { Howl: BrokenHowl, Howler: { codecs: () => false } };

    expect(() => resolveHowlerSoundPrototype(mod as never)).not.toThrow();
    expect(resolveHowlerSoundPrototype(mod as never)).toBeNull();
  });
});
