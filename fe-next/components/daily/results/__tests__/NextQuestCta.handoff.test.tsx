import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextQuestCta } from '../NextQuestCta';
import { DailyRevealProvider } from '../reveal/DailyRevealContext';
import { consumeDailyHandoff } from '@/components/daily/flow/dailyHandoff';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
const playedStatus = {
  today: { wordHunt: false, wordWheel: true, wordTower: false, connections: false },
  streak: { current: 1, longest: 1 }, loading: false, refresh: vi.fn(),
};
vi.mock('@/hooks/useDailyPlayedStatus', () => ({ useDailyPlayedStatus: () => playedStatus }));

const animate = vi.fn();
describe('NextQuestCta chain handoff', () => {
  beforeEach(() => {
    sessionStorage.clear();
    animate.mockClear();
    (HTMLElement.prototype as unknown as { animate: unknown }).animate = animate;
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
    vi.useRealTimers();
  });

  it('given a press, then the next quest knows it was a handoff', () => {
    render(<NextQuestCta justFinished="word-wheel" currentLanguage="en" />);
    fireEvent.click(screen.getByTestId('next-quest-cta'));
    expect(consumeDailyHandoff('word-hunt')).toBe(true);
  });

  it('given a pointer down, then the press plays a transform-only send-off without blocking the link', () => {
    render(<NextQuestCta justFinished="word-wheel" currentLanguage="en" />);
    fireEvent.pointerDown(screen.getByTestId('next-quest-cta'));
    expect(animate).toHaveBeenCalled();
    const frames = animate.mock.calls[0][0] as Keyframe[];
    frames.forEach((f) => expect(Object.keys(f).every((k) => ['transform', 'offset', 'easing'].includes(k))).toBe(true));
  });

  it('shows where the next quest sits in the chain, from the same play state', () => {
    render(<NextQuestCta justFinished="word-wheel" currentLanguage="en" />);
    const pips = screen.getByTestId('next-quest-pips').children;
    expect(Array.from(pips).map((p) => p.getAttribute('data-pip'))).toEqual(['done', 'active', 'next', 'next']);
  });

  it('given the all-clear state, then nothing marks a handoff', () => {
    playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
    render(<NextQuestCta justFinished="word-hunt" currentLanguage="en" />);
    fireEvent.click(screen.getByTestId('next-quest-all-clear'));
    expect(sessionStorage.getItem('lc:daily-handoff')).toBeNull();
    playedStatus.today = { wordHunt: false, wordWheel: true, wordTower: false, connections: false };
  });

  it('given a fresh finish, then the arrow pulses once the reveal settles; a revisit never pulses', () => {
    vi.useFakeTimers();
    const { unmount } = render(<DailyRevealProvider celebrate><NextQuestCta justFinished="word-wheel" currentLanguage="en" /></DailyRevealProvider>);
    expect(animate).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(animate).toHaveBeenCalledTimes(1);
    unmount();
    animate.mockClear();
    render(<DailyRevealProvider celebrate={false}><NextQuestCta justFinished="word-wheel" currentLanguage="en" /></DailyRevealProvider>);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(animate).not.toHaveBeenCalled();
  });
});

describe('NextQuestCta remounted after the reveal', () => {
  it('given the reveal already finished, when the CTA remounts, then it does not pulse again', () => {
    (HTMLElement.prototype as unknown as { animate: unknown }).animate = animate;
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
    vi.useFakeTimers();
    const Screen = ({ on }: { on: boolean }) => (
      <DailyRevealProvider celebrate>{on ? <NextQuestCta justFinished="word-wheel" currentLanguage="en" /> : <div />}</DailyRevealProvider>
    );
    const { rerender } = render(<Screen on />);
    act(() => { vi.advanceTimersByTime(3000); });
    animate.mockClear();
    rerender(<Screen on={false} />);
    rerender(<Screen on />);
    act(() => { vi.advanceTimersByTime(3000); });
    vi.useRealTimers();
    expect(animate).not.toHaveBeenCalled();
    delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
  });
});
