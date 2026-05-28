// SharedFxMount wires the SharedFxApp Pixi singleton once at app root. Without
// it, every spawnCoinStream / spawnFirework / spawnBurst call no-ops (app=null)
// — the silent prod regression where coin/level-up/firework FX never rendered.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SharedFxMount } from '../SharedFxMount';

const mount = vi.fn().mockResolvedValue(undefined);
const unmount = vi.fn();
vi.mock('@/lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: {
    mount: (...args: unknown[]) => mount(...args),
    unmount: () => unmount(),
  },
}));

const deviceConfig = {
  isLowEnd: false,
  targetFPS: 60 as const,
  throttleMs: 16,
  enableComplexAnimations: true,
  enableGlowEffects: true,
  reduceParticles: false,
  maxParticles: 20,
  prefersReducedMotion: false,
  isSlowConnection: false,
  isMobile: false,
};
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => deviceConfig,
}));

let nativeFlag = false;
vi.mock('@/utils/platform', () => ({ isNative: () => nativeFlag }));

let celebrationIntensity: 'full' | 'gentle' | 'calm' = 'full';
vi.mock('@/contexts/AccessibilityContext', () => ({
  useCelebrationIntensity: () => celebrationIntensity,
}));

describe('SharedFxMount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deviceConfig.maxParticles = 20;
    deviceConfig.prefersReducedMotion = false;
    nativeFlag = false;
    celebrationIntensity = 'full';
  });

  it('does NOT mount the fullscreen FX canvas on native (it can occlude the page)', () => {
    nativeFlag = true;
    render(<SharedFxMount />);
    expect(mount).not.toHaveBeenCalled();
    cleanup();
  });

  it('renders nothing', () => {
    const { container } = render(<SharedFxMount />);
    expect(container.firstChild).toBeNull();
    cleanup();
  });

  it('mounts the singleton on document.body with the device config', () => {
    render(<SharedFxMount />);
    expect(mount).toHaveBeenCalledTimes(1);
    expect(mount).toHaveBeenCalledWith(document.body, {
      maxParticles: 20,
      prefersReducedMotion: false,
    });
    cleanup();
  });

  it('unmounts the singleton on teardown', () => {
    const { unmount: unmountTree } = render(<SharedFxMount />);
    unmountTree();
    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it('does not initialize Pixi when prefersReducedMotion is true', () => {
    deviceConfig.prefersReducedMotion = true;
    render(<SharedFxMount />);
    expect(mount).not.toHaveBeenCalled();
    cleanup();
  });

  it('does not initialize Pixi when the particle budget is zero (very low-end)', () => {
    deviceConfig.maxParticles = 0;
    render(<SharedFxMount />);
    expect(mount).not.toHaveBeenCalled();
    cleanup();
  });

  it('does not initialize the Pixi FX layer in calm mode (no GPU bursts/fireworks)', () => {
    // Cosy / Calm Mode replaces particle celebrations with quiet feedback, so
    // the always-on GPU particle layer must stay dark.
    celebrationIntensity = 'calm';
    render(<SharedFxMount />);
    expect(mount).not.toHaveBeenCalled();
    cleanup();
  });

  it('still mounts the FX layer at gentle intensity (non-cosy reduce-effects path)', () => {
    celebrationIntensity = 'gentle';
    render(<SharedFxMount />);
    expect(mount).toHaveBeenCalledTimes(1);
    cleanup();
  });
});
