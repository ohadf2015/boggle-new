import { describe, it, expect, vi } from 'vitest';
import { mediaVolumeIsReadOnly, routeHtml5VolumeThroughGain } from '../html5VolumeBridge';

/** An audio element like iOS Safari's: writes to `volume` are ignored, it always reads 1. */
class IosAudio {
  crossOrigin: string | null = null;
  muted = false;
  src = '';
  listeners: Record<string, (() => void)[]> = {};
  get volume() { return 1; }
  set volume(_v: number) { /* ignored by iOS */ }
  addEventListener(type: string, fn: () => void) { (this.listeners[type] ??= []).push(fn); }
  emit(type: string) { this.listeners[type]?.forEach((fn) => fn()); }
}

function fakeHowler(state: AudioContextState = 'running') {
  const gains: { gain: { value: number }; connect: ReturnType<typeof vi.fn> }[] = [];
  const ctx = {
    state,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createMediaElementSource: vi.fn(() => ({ connect: vi.fn() })),
    createGain: vi.fn(() => {
      const g = { gain: { value: 1 }, connect: vi.fn() };
      gains.push(g);
      return g;
    }),
  };
  const pool: IosAudio[] = [];
  const howler = {
    ctx,
    autoSuspend: true,
    _obtainHtml5Audio: vi.fn(() => pool.pop() ?? new IosAudio()),
  };
  return { howler, ctx, gains, pool };
}

describe('mediaVolumeIsReadOnly', () => {
  it('is true when the audio element ignores volume writes (iOS Safari)', () => {
    vi.stubGlobal('Audio', IosAudio);
    expect(mediaVolumeIsReadOnly()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('is false where volume writes stick (desktop browsers)', () => {
    expect(mediaVolumeIsReadOnly()).toBe(false);
  });
});

describe('routeHtml5VolumeThroughGain', () => {
  it('turns volume writes on a pooled node into gain changes', () => {
    const { howler, gains } = fakeHowler();
    routeHtml5VolumeThroughGain(howler as never);

    const node = howler._obtainHtml5Audio() as unknown as IosAudio;
    node.volume = 0.25;

    expect(gains[0].gain.value).toBe(0.25);
    expect(node.volume).toBe(0.25);
  });

  it('silences the gain when the node is muted and restores the level on unmute', () => {
    const { howler, gains } = fakeHowler();
    routeHtml5VolumeThroughGain(howler as never);
    const node = howler._obtainHtml5Audio() as unknown as IosAudio;
    node.volume = 0.4;

    node.muted = true;
    expect(gains[0].gain.value).toBe(0);
    node.muted = false;
    expect(gains[0].gain.value).toBe(0.4);
  });

  it('sets crossOrigin before Howler assigns src, so CDN audio is not silenced', () => {
    const { howler } = fakeHowler();
    routeHtml5VolumeThroughGain(howler as never);
    const node = howler._obtainHtml5Audio() as unknown as IosAudio;
    expect(node.src).toBe('');
    expect(node.crossOrigin).toBe('anonymous');
  });

  it('wires each node into the graph once, even when the pool hands it out again', () => {
    const { howler, ctx, pool } = fakeHowler();
    routeHtml5VolumeThroughGain(howler as never);
    const node = howler._obtainHtml5Audio() as unknown as IosAudio;
    pool.push(node);
    howler._obtainHtml5Audio();

    expect(ctx.createMediaElementSource).toHaveBeenCalledTimes(1);
  });

  it('keeps the context running: no 30s auto-suspend, and resumes on play', () => {
    const { howler, ctx } = fakeHowler('interrupted' as AudioContextState);
    routeHtml5VolumeThroughGain(howler as never);
    expect(howler.autoSuspend).toBe(false);

    const node = howler._obtainHtml5Audio() as unknown as IosAudio;
    node.emit('play');
    expect(ctx.resume).toHaveBeenCalled();
  });

  it('keeps the media playback audio session so the silent switch behaves as before', () => {
    const session = { type: 'auto' };
    vi.stubGlobal('navigator', { audioSession: session });
    routeHtml5VolumeThroughGain(fakeHowler().howler as never);
    expect(session.type).toBe('playback');
    vi.unstubAllGlobals();
  });

  it('leaves the node untouched when there is no AudioContext', () => {
    const { howler } = fakeHowler();
    (howler as { ctx: unknown }).ctx = null;
    routeHtml5VolumeThroughGain(howler as never);
    const node = howler._obtainHtml5Audio() as unknown as IosAudio;
    node.volume = 0.3;
    expect(node.volume).toBe(1);
  });
});
