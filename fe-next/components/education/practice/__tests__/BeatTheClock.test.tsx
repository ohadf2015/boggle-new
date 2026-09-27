import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import BeatTheClock from '../BeatTheClock';

const playSound = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    dir: 'ltr',
  }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound }),
}));

const onExpire = vi.fn();

const baseProps = {
  mode: 'solo_board' as const,
  wordCount: 8,
  active: true,
  onExpire,
};

describe('BeatTheClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts on for Solo Board and counts down', () => {
    render(<BeatTheClock {...baseProps} defaultOn />);
    const chip = screen.getByTestId('beat-the-clock');
    expect(chip).toHaveAttribute('data-enabled', 'true');
    expect(screen.getByTestId('beat-the-clock-time')).toHaveTextContent('1:30');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('beat-the-clock-time')).toHaveTextContent('1:27');
  });

  it('starts off for Flashcard and shows no clock until switched on', () => {
    render(<BeatTheClock {...baseProps} mode="flashcard" defaultOn={false} />);
    expect(screen.getByTestId('beat-the-clock')).toHaveAttribute('data-enabled', 'false');
    expect(screen.queryByTestId('beat-the-clock-time')).not.toBeInTheDocument();
  });

  it('lets the student switch the clock on and off', () => {
    render(<BeatTheClock {...baseProps} mode="flashcard" defaultOn={false} />);
    fireEvent.click(screen.getByTestId('beat-the-clock-toggle'));
    expect(screen.getByTestId('beat-the-clock')).toHaveAttribute('data-enabled', 'true');
    // 8 words x 6s = 48s
    expect(screen.getByTestId('beat-the-clock-time')).toHaveTextContent('0:48');

    fireEvent.click(screen.getByTestId('beat-the-clock-toggle'));
    expect(screen.queryByTestId('beat-the-clock-time')).not.toBeInTheDocument();
  });

  it('calls onExpire exactly once when the clock runs out', () => {
    render(<BeatTheClock {...baseProps} defaultOn />);
    act(() => {
      vi.advanceTimersByTime(95_000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('never runs the clock while the round is not active', () => {
    render(<BeatTheClock {...baseProps} defaultOn active={false} />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByTestId('beat-the-clock-time')).toHaveTextContent('1:30');
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('stings once as the clock enters the red', () => {
    render(<BeatTheClock {...baseProps} defaultOn />);
    act(() => {
      vi.advanceTimersByTime(81_000); // 90 -> 9 left
    });
    expect(playSound).toHaveBeenCalledWith(
      'timerUrgent',
      expect.objectContaining({ requiresGameActive: false })
    );
    const urgentCalls = playSound.mock.calls.filter((c) => c[0] === 'timerUrgent').length;
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(playSound.mock.calls.filter((c) => c[0] === 'timerUrgent').length).toBe(urgentCalls);
  });

  it('marks itself urgent so the bar can go red', () => {
    render(<BeatTheClock {...baseProps} defaultOn />);
    expect(screen.getByTestId('beat-the-clock')).toHaveAttribute('data-urgent', 'false');
    act(() => {
      vi.advanceTimersByTime(81_000);
    });
    expect(screen.getByTestId('beat-the-clock')).toHaveAttribute('data-urgent', 'true');
  });
  /*
   * Contrast: OFF is the chip's resting state on Flashcard, and an unfilled
   * navy chip with a black border is exactly the tone-on-tone the design
   * addendum forbids — the one control on the screen that a student has to
   * find in order to turn the game on.
   */
  it('stays visible against the navy surface while switched off', () => {
    render(<BeatTheClock {...baseProps} defaultOn={false} />);
    const toggle = screen.getByTestId('beat-the-clock-toggle');
    expect(toggle.className).toContain('border-neo-cream');
    expect(toggle.className).toContain('text-neo-cream');
  });
});
