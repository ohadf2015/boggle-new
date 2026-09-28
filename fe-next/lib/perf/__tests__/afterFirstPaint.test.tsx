import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { shouldMountHeavyClientBoot } from '../afterFirstPaint';
import { useAfterFirstPaint } from '../afterFirstPaint';

describe('shouldMountHeavyClientBoot', () => {
  it('mounts immediately on marketing routes', () => {
    expect(shouldMountHeavyClientBoot('/en', false)).toBe(true);
    expect(shouldMountHeavyClientBoot('/en/blog', false)).toBe(true);
  });

  it('holds the heavy boot on /singleplayer until after first paint', () => {
    expect(shouldMountHeavyClientBoot('/en/singleplayer', false)).toBe(false);
    expect(shouldMountHeavyClientBoot('/en/singleplayer', true)).toBe(true);
  });
});

describe('useAfterFirstPaint', () => {
  let rafCallbacks: FrameRequestCallback[] = [];
  const runRafWave = () => {
    const wave = rafCallbacks.splice(0);
    wave.forEach((cb) => cb(0));
  };

  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is ready immediately when defer is false', () => {
    const { result } = renderHook(() => useAfterFirstPaint(false));
    expect(result.current).toBe(true);
  });

  it('stays false until two animation frames when defer is true', () => {
    const { result } = renderHook(() => useAfterFirstPaint(true));
    expect(result.current).toBe(false);
    act(() => {
      runRafWave();
    });
    expect(result.current).toBe(false);
    act(() => {
      runRafWave();
    });
    expect(result.current).toBe(true);
  });
});
