import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import {
  AccessibilityProvider,
  useAccessibility,
  useDisableFireRoundLights,
  useDisableEarthquakeEffects,
  useShouldReduceMotion,
  useCosyMode,
  useSuppressTimerUrgency,
  useCelebrationIntensity,
} from '../AccessibilityContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AccessibilityProvider>{children}</AccessibilityProvider>
);

beforeEach(() => {
  window.localStorage.clear();
});

describe('Cosy mode wiring in AccessibilityContext', () => {
  it('defaults cosyMode off and leaves effects enabled', () => {
    const { result } = renderHook(
      () => ({
        cosy: useCosyMode(),
        fire: useDisableFireRoundLights(),
        quake: useDisableEarthquakeEffects(),
        urgency: useSuppressTimerUrgency(),
        celebration: useCelebrationIntensity(),
      }),
      { wrapper },
    );
    expect(result.current.cosy).toBe(false);
    expect(result.current.fire).toBe(false);
    expect(result.current.quake).toBe(false);
    expect(result.current.urgency).toBe(false);
    expect(result.current.celebration).toBe('full');
  });

  it('enabling cosy flips every effective calming flag on', () => {
    const { result } = renderHook(
      () => ({
        ctx: useAccessibility(),
        fire: useDisableFireRoundLights(),
        quake: useDisableEarthquakeEffects(),
        reduceMotion: useShouldReduceMotion(),
        urgency: useSuppressTimerUrgency(),
        celebration: useCelebrationIntensity(),
      }),
      { wrapper },
    );

    act(() => {
      result.current.ctx.toggleCosyMode();
    });

    expect(result.current.ctx.cosyMode).toBe(true);
    expect(result.current.fire).toBe(true);
    expect(result.current.quake).toBe(true);
    expect(result.current.reduceMotion).toBe(true);
    expect(result.current.urgency).toBe(true);
    expect(result.current.celebration).toBe('gentle');
  });

  it('reflects cosy on the <html> data-cosy attribute (drives the calm palette)', () => {
    const { result } = renderHook(() => useAccessibility(), { wrapper });
    expect(document.documentElement.dataset.cosy).toBeUndefined();

    act(() => result.current.toggleCosyMode());
    expect(document.documentElement.dataset.cosy).toBe('true');

    act(() => result.current.toggleCosyMode());
    expect(document.documentElement.dataset.cosy).toBeUndefined();
  });

  it('toggling cosy back off restores the underlying (default) flags', () => {
    const { result } = renderHook(
      () => ({ ctx: useAccessibility(), fire: useDisableFireRoundLights() }),
      { wrapper },
    );

    act(() => result.current.ctx.toggleCosyMode());
    expect(result.current.fire).toBe(true);
    act(() => result.current.ctx.toggleCosyMode());
    expect(result.current.fire).toBe(false);
  });
});
