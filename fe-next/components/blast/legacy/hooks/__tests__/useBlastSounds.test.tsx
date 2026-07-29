import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastSounds } from '../useBlastSounds';

// Mock SoundEffectsContext — we only need stable no-op functions so the hook
// can mount without rendering the real provider.
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playComboSound: vi.fn(),
    playComboMilestoneSound: vi.fn(),
    playComboBreakSound: vi.fn(),
    playErrorSound: vi.fn(),
    playAchievementSound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playSound: vi.fn(),
    playBlastBombSound: vi.fn(),
    playBlastLightningSound: vi.fn(),
    playBlastPrismSound: vi.fn(),
    playTileSelectSound: vi.fn(),
    playLongWordBonusSound: vi.fn(),
    playLegendaryWordSound: vi.fn(),
    playMegaCascadeSound: vi.fn(),
  }),
}));

// ── AudioContext mock ──
// AudioContext is a finite OS resource. We spy on .close() to assert the hook
// releases it on unmount.
class MockOscillator {
  type = 'sine';
  frequency = { value: 0 };
  detune = { value: 0 };
  connect = vi.fn().mockReturnThis();
  start = vi.fn();
  stop = vi.fn();
}
class MockGain {
  gain = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn().mockReturnThis();
}

class MockAudioContext {
  state: 'running' | 'suspended' | 'closed' = 'running';
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  resume = vi.fn().mockImplementation(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  close = vi.fn().mockImplementation(() => {
    this.state = 'closed';
    return Promise.resolve();
  });
  createOscillator = vi.fn().mockImplementation(() => new MockOscillator());
  createGain = vi.fn().mockImplementation(() => new MockGain());
}

let mockCtx: MockAudioContext;

beforeEach(() => {
  mockCtx = new MockAudioContext();
  // Use a real function constructor so `new window.AudioContext()` works.
  // vi.fn arrow implementations cannot be invoked with `new`.
  // @ts-expect-error — overriding global for test
  window.AudioContext = function MockAudioContextCtor() { return mockCtx; };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useBlastSounds — AudioContext lifecycle', () => {
  it('closes the AudioContext on unmount to release the OS resource', () => {
    const { result, unmount } = renderHook(() => useBlastSounds());

    // Trigger lazy AudioContext creation by playing a path tone.
    act(() => {
      result.current.playPathTone(1);
    });
    expect(mockCtx.close).not.toHaveBeenCalled();

    unmount();

    expect(mockCtx.close).toHaveBeenCalledTimes(1);
    expect(mockCtx.state).toBe('closed');
  });

  it('does not throw on unmount if AudioContext was never created', () => {
    const { unmount } = renderHook(() => useBlastSounds());
    // Never trigger any sound — audioCtxRef stays null.
    expect(() => unmount()).not.toThrow();
    expect(mockCtx.close).not.toHaveBeenCalled();
  });

  it('does not double-close an already-closed AudioContext', () => {
    const { result, unmount } = renderHook(() => useBlastSounds());
    act(() => {
      result.current.playPathTone(1);
    });
    // Simulate context already closed (e.g. by browser tab visibility logic).
    mockCtx.state = 'closed';

    unmount();

    expect(mockCtx.close).not.toHaveBeenCalled();
  });
});
