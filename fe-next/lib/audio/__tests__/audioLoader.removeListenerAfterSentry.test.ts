import { describe, it, expect, afterEach, vi } from 'vitest';
import { ensureHowl } from '../audioLoader';

describe('audio removeEventListener patch vs a later EventTarget wrapper (lazy Sentry)', () => {
  let proto: EventTarget = document.createElement('audio');
  while (!Object.prototype.hasOwnProperty.call(proto, 'dispatchEvent')) proto = Object.getPrototypeOf(proto);
  const nativeAdd = proto.addEventListener;
  const nativeRemove = proto.removeEventListener;

  afterEach(() => {
    proto.addEventListener = nativeAdd;
    proto.removeEventListener = nativeRemove;
  });

  function installSentryLikeWrapper(): void {
    const wrapped = new WeakMap<object, EventListener>();
    proto.addEventListener = function (type, listener, options) {
      if (typeof listener !== 'function') return nativeAdd.call(this, type, listener, options);
      const w: EventListener = (e) => (listener as EventListener)(e);
      wrapped.set(listener, w);
      return nativeAdd.call(this, type, w, options);
    };
    proto.removeEventListener = function (type, listener, options) {
      const w = listener && wrapped.get(listener as object);
      nativeRemove.call(this, type, w ?? listener, options);
    };
  }

  it('removes a listener from an <audio> element when the wrapper loads after howler', async () => {
    await ensureHowl();
    installSentryLikeWrapper();

    const audio = document.createElement('audio');
    const listener = vi.fn();
    audio.addEventListener('canplaythrough', listener);
    audio.removeEventListener('canplaythrough', listener);
    audio.dispatchEvent(new Event('canplaythrough'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('still ignores undefined / numeric listeners', async () => {
    await ensureHowl();
    const audio = document.createElement('audio');
    expect(() => audio.removeEventListener('ended', undefined as unknown as EventListener)).not.toThrow();
    expect(() => audio.removeEventListener('ended', 42 as unknown as EventListener)).not.toThrow();
  });
});
