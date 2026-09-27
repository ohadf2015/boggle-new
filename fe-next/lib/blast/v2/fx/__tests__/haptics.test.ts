import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHaptics } from '../haptics';
import * as framerMotion from 'framer-motion';

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof framerMotion>('framer-motion');
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

describe('useHaptics', () => {
  let vibrateStub: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vibrateStub = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateStub,
      writable: true,
      configurable: true,
    });
    localStorage.clear();
    vi.mocked(framerMotion.useReducedMotion).mockReturnValue(false);
  });

  it('should vibrate light pattern [20, 10]', () => {
    const { vibrateLight } = useHaptics();
    vibrateLight();

    expect(vibrateStub).toHaveBeenCalledWith([20, 10]);
  });

  it('should vibrate medium pattern [40, 20, 40]', () => {
    const { vibrateMedium } = useHaptics();
    vibrateMedium();

    expect(vibrateStub).toHaveBeenCalledWith([40, 20, 40]);
  });

  it('should vibrate heavy pattern [60, 30, 60, 30, 60]', () => {
    const { vibrateHeavy } = useHaptics();
    vibrateHeavy();

    expect(vibrateStub).toHaveBeenCalledWith([60, 30, 60, 30, 60]);
  });

  it('should vibrate success chord pattern [100, 50, 50, 50]', () => {
    const { vibrateSuccessChord } = useHaptics();
    vibrateSuccessChord();

    expect(vibrateStub).toHaveBeenCalledWith([100, 50, 50, 50]);
  });

  it('should skip vibration if reduced motion is enabled', () => {
    vi.mocked(framerMotion.useReducedMotion).mockReturnValue(true);
    const { vibrateLight } = useHaptics();

    vibrateLight();

    expect(vibrateStub).not.toHaveBeenCalled();
    vi.mocked(framerMotion.useReducedMotion).mockReturnValue(false);
  });

  it('should skip vibration if haptics-enabled is false in localStorage', () => {
    localStorage.setItem('haptics-enabled', 'false');
    const { vibrateMedium } = useHaptics();

    vibrateMedium();

    expect(vibrateStub).not.toHaveBeenCalled();
  });

  it('should vibrate by default if haptics-enabled not set', () => {
    const { vibrateLight } = useHaptics();
    vibrateLight();

    expect(vibrateStub).toHaveBeenCalled();
  });

  it('should skip vibration if navigator.vibrate does not exist', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const { vibrateLight } = useHaptics();

    expect(() => vibrateLight()).not.toThrow();
  });
});
