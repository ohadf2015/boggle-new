import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const isEnabled = vi.fn(() => true);
vi.mock('@/utils/haptics/HapticsManager', () => ({ haptics: { isEnabled: () => isEnabled() } }));

import { pulseLive, liveHapticKind } from '../liveHaptics';

describe('pulseLive', () => {
  let vibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });
    isEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>).vibrate;
  });

  it('given a valid word, when pulsed, then the phone buzzes 10ms', () => {
    expect(pulseLive('valid', false)).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it('given a best word, when pulsed, then the phone buzzes 30ms', () => {
    pulseLive('big', false);
    expect(vibrate).toHaveBeenCalledWith(30);
  });

  it('given reduced effects, when pulsed, then nothing buzzes', () => {
    expect(pulseLive('big', true)).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('given the player switched haptics off, when pulsed, then nothing buzzes', () => {
    isEnabled.mockReturnValue(false);
    expect(pulseLive('valid', false)).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('given a browser without the vibration API, when pulsed, then it is a quiet no-op', () => {
    delete (navigator as unknown as Record<string, unknown>).vibrate;
    expect(pulseLive('valid', false)).toBe(false);
  });
});

describe('liveHapticKind', () => {
  it('given the first scoring word, then it is the best so far', () => {
    expect(liveHapticKind(5, 0)).toBe('big');
  });

  it('given a word under my round best, then it is a plain valid buzz', () => {
    expect(liveHapticKind(3, 8)).toBe('valid');
  });

  it('given a word that beats my round best, then it is the big buzz', () => {
    expect(liveHapticKind(9, 8)).toBe('big');
  });

  it('given a zero-point accept, then nothing buzzes', () => {
    expect(liveHapticKind(0, 8)).toBeNull();
  });
});
