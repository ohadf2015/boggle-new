import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import WheelTimeUpStamp, { FINISH_BEAT_MS } from '../WheelTimeUpStamp';

describe('WheelTimeUpStamp', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('Given the clock ran out, When the beat plays, Then it stamps the end and hands over after ~900ms', () => {
    const onDone = vi.fn();
    render(<WheelTimeUpStamp wordsFound={4} onDone={onDone} />);
    expect(screen.getByTestId('wheel-time-up').textContent).toContain('wordWheel.gameOver');
    expect(FINISH_BEAT_MS).toBeGreaterThanOrEqual(800);
    expect(FINISH_BEAT_MS).toBeLessThanOrEqual(1000);
    act(() => { vi.advanceTimersByTime(FINISH_BEAT_MS - 1); });
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('Given an impatient player, When they tap the stamp, Then results open at once and only once', () => {
    const onDone = vi.fn();
    render(<WheelTimeUpStamp wordsFound={4} onDone={onDone} />);
    fireEvent.click(screen.getByTestId('wheel-time-up'));
    act(() => { vi.advanceTimersByTime(FINISH_BEAT_MS * 2); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
