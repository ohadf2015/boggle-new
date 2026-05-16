/**
 * DynamicEnergyBackground gating tests.
 *
 * The vortex / aurora / scanline / particle stack is GPU-expensive (200%×200%
 * rotating gradient + scrolling stripe). Letting it composite during MP grid
 * drag selection was the dominant cause of "stutter when selecting words" on
 * mid/low-end Android. The component now self-gates on device capability so
 * even single-player surfaces stay smooth on those devices.
 *
 * @vitest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamicEnergyBackground } from '../DynamicEnergyBackground';

const performanceMock = vi.fn();

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => performanceMock(),
}));

beforeEach(() => {
  performanceMock.mockReset();
});

describe('DynamicEnergyBackground capability gating', () => {
  it('renders the full vortex/aurora/scanline stack on capable devices', () => {
    performanceMock.mockReturnValue({
      isLowEnd: false,
      prefersReducedMotion: false,
      enableComplexAnimations: true,
    });

    const { container } = render(<DynamicEnergyBackground />);
    expect(container.querySelector('.energy-vortex-layer')).toBeTruthy();
    expect(container.querySelector('.energy-aurora-layer')).toBeTruthy();
    expect(container.querySelector('.energy-scanline-layer')).toBeTruthy();
  });

  it('renders nothing on low-end devices (Android stutter fix)', () => {
    performanceMock.mockReturnValue({
      isLowEnd: true,
      prefersReducedMotion: false,
      enableComplexAnimations: false,
    });

    const { container } = render(<DynamicEnergyBackground />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when prefers-reduced-motion is set', () => {
    performanceMock.mockReturnValue({
      isLowEnd: false,
      prefersReducedMotion: true,
      enableComplexAnimations: false,
    });

    const { container } = render(<DynamicEnergyBackground />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when complex animations are disabled (mid-range or saver)', () => {
    performanceMock.mockReturnValue({
      isLowEnd: false,
      prefersReducedMotion: false,
      enableComplexAnimations: false,
    });

    const { container } = render(<DynamicEnergyBackground />);
    expect(container.firstChild).toBeNull();
  });
});
