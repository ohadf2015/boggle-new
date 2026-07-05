import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { WordTowerSighting } from './WordTowerSighting';
import { SIGHTING_MIN_ALT_M } from '@/lib/wordTower/skySightings';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); cleanup(); vi.restoreAllMocks(); });

const ROLL_INTERVAL_MS = 4800;
const DRIFT_MS = 13000; // calmer, longer glide (#10)

describe('WordTowerSighting', () => {
  it('renders nothing under reduced motion, however lucky the roll', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001); // always a hit
    const { container } = render(<WordTowerSighting heightM={900} reducedMotion />);
    act(() => { vi.advanceTimersByTime(ROLL_INTERVAL_MS * 3); });
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('div')).toBeNull();
  });

  it('shows nothing below the minimum altitude even on a hitting roll', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001);
    const { container } = render(<WordTowerSighting heightM={SIGHTING_MIN_ALT_M - 1} />);
    act(() => { vi.advanceTimersByTime(ROLL_INTERVAL_MS); });
    expect(container.querySelector('img')).toBeNull();
  });

  it('drifts a whale across the sky at altitude, then retires it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001); // whale at deep altitude
    const { container } = render(<WordTowerSighting heightM={600} />);
    // No sighting before the first roll lands.
    expect(container.querySelector('img')).toBeNull();
    act(() => { vi.advanceTimersByTime(ROLL_INTERVAL_MS); });
    const whale = container.querySelector('img');
    expect(whale).not.toBeNull();
    expect(whale?.getAttribute('src')).toBe('/images/word-tower/wt-spacewhale.png');
    // After the drift completes it retires itself.
    act(() => { vi.advanceTimersByTime(DRIFT_MS + 400); });
    expect(container.querySelector('img')).toBeNull();
  });

  it('only one sighting is on screen at a time', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001);
    const { container } = render(<WordTowerSighting heightM={600} />);
    act(() => { vi.advanceTimersByTime(ROLL_INTERVAL_MS); });
    act(() => { vi.advanceTimersByTime(ROLL_INTERVAL_MS); }); // another roll while one is live
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });
});
