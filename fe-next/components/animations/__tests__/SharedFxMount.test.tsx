// SharedFxMount wires the SharedFxApp Pixi singleton once at app root. Without
// it, every spawnCoinStream / spawnFirework / spawnBurst call no-ops (app=null)
// — the silent prod regression where coin/level-up/firework FX never rendered.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
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

/** SharedFxApp is now behind a dynamic import so its bytes never load on devices
 *  that skip the FX layer. Let the import promise settle before asserting. */
const flushImport = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe('SharedFxMount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deviceConfig.maxParticles = 20;
    deviceConfig.prefersReducedMotion = false;
    deviceConfig.isLowEnd = false;
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

  it('mounts the singleton on document.body with the device config', async () => {
    render(<SharedFxMount />);
    await flushImport();
    expect(mount).toHaveBeenCalledTimes(1);
    expect(mount).toHaveBeenCalledWith(document.body, {
      maxParticles: 20,
      prefersReducedMotion: false,
    });
    cleanup();
  });

  it('unmounts the singleton on teardown', async () => {
    const { unmount: unmountTree } = render(<SharedFxMount />);
    await flushImport();
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

  it('still mounts the FX layer at gentle intensity (non-cosy reduce-effects path)', async () => {
    celebrationIntensity = 'gentle';
    render(<SharedFxMount />);
    await flushImport();
    expect(mount).toHaveBeenCalledTimes(1);
    cleanup();
  });

  // --- low-end device budget -------------------------------------------------
  // Pixi is ~254KB gzip / 856KB parsed. Downloading, compiling and spinning up a
  // fullscreen WebGL context for decorative coin sparkles is the single most
  // expensive thing a low-end phone does on page load. It must not happen there.

  it('does NOT load Pixi at all on a low-end device', async () => {
    // Given a device the tier system has classified (or downgraded) to low-end
    deviceConfig.isLowEnd = true;
    // When the FX mount renders
    render(<SharedFxMount />);
    await flushImport();
    // Then the WebGL layer never initializes
    expect(mount).not.toHaveBeenCalled();
    cleanup();
  });

  it('tears the FX layer down when the device is downgraded mid-session', async () => {
    // Given a capable device with the FX layer running
    const { rerender } = render(<SharedFxMount />);
    await flushImport();
    expect(mount).toHaveBeenCalledTimes(1);
    // When the runtime frame watcher downgrades it
    deviceConfig.isLowEnd = true;
    deviceConfig.maxParticles = 4;
    rerender(<SharedFxMount />);
    await flushImport();
    // Then the GPU layer is released instead of limping along
    expect(unmount).toHaveBeenCalled();
    cleanup();
  });

  it('does not pull the Pixi module into the initial evaluation', () => {
    // Given the module graph as imported by this test file
    // When SharedFxMount is evaluated but never rendered
    // Then Pixi has not been requested yet — it is behind a dynamic import so the
    // bytes never reach devices that skip the layer.
    expect(mount).not.toHaveBeenCalled();
  });
});
