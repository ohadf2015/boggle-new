import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useComboSystem } from '../useComboSystem';

// Helper: fire two rapid incrementCombo calls to activate a combo (level > 0)
function activateCombo(result: { current: ReturnType<typeof useComboSystem> }) {
  // First word — sets lastWordTime but combo stays 0
  act(() => { result.current.incrementCombo(true); });
  // Second word within window — combo becomes 1, timer starts
  act(() => { result.current.incrementCombo(true); });
}

describe('useComboSystem — timerIntervalMs option', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should use 500ms interval by default', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const { result } = renderHook(() => useComboSystem());

    activateCombo(result);

    const intervalCalls = setIntervalSpy.mock.calls.filter(
      ([, ms]) => ms === 500
    );
    expect(intervalCalls.length).toBeGreaterThan(0);

    setIntervalSpy.mockRestore();
  });

  it('should use custom timerIntervalMs when provided', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const { result } = renderHook(() =>
      useComboSystem({ timerIntervalMs: 500 })
    );

    activateCombo(result);

    const intervalCalls = setIntervalSpy.mock.calls.filter(
      ([, ms]) => ms === 500
    );
    expect(intervalCalls.length).toBeGreaterThan(0);

    // Should NOT have 250ms intervals
    const defaultCalls = setIntervalSpy.mock.calls.filter(
      ([, ms]) => ms === 250
    );
    expect(defaultCalls.length).toBe(0);

    setIntervalSpy.mockRestore();
  });

  it('should update comboTimeRemaining at the specified interval', () => {
    const { result } = renderHook(() =>
      useComboSystem({ timerIntervalMs: 500 })
    );

    activateCombo(result);

    // Combo is now active, timer running
    expect(result.current.comboLevel).toBeGreaterThan(0);
    expect(result.current.comboTimeRemaining).not.toBeNull();

    const initialRemaining = result.current.comboTimeRemaining!;

    // Advance 500ms — should trigger one update
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Time remaining should have decreased
    expect(result.current.comboTimeRemaining).not.toBeNull();
    expect(result.current.comboTimeRemaining!).toBeLessThan(initialRemaining);
  });
});
