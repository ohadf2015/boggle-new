import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/image', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/education/motion/ChestBurst', () => ({
  ChestBurst: ({ playing }: { playing: boolean }) => <i data-testid="burst" data-playing={String(playing)} />,
}));

import { DailyChest } from '../DailyChest';

describe('<DailyChest> pre-laid reveal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ newTotalXp: 1 }) }) as never;
  });
  afterEach(() => vi.useRealTimers());

  it('lays the reveal out hidden once the hub is idle, so the tap mounts nothing', () => {
    render(<DailyChest userId="s" reducedMotion={false} onGranted={vi.fn()} />);
    expect(screen.queryByTestId('academy-chest-reveal')).toBeNull();
    act(() => { vi.advanceTimersByTime(1300); });
    const reveal = screen.getByTestId('academy-chest-reveal');
    expect(reveal.className).toContain('invisible');
    expect(reveal).toHaveAttribute('aria-hidden', 'true');
    const burst = screen.getByTestId('burst');
    expect(burst).toHaveAttribute('data-playing', 'false');

    fireEvent.click(screen.getByTestId('academy-daily-chest'));
    expect(screen.getByTestId('academy-chest-reveal')).toBe(reveal);
    expect(reveal.className).not.toContain('invisible');
    act(() => { vi.advanceTimersByTime(460); });
    expect(screen.getByTestId('burst')).toBe(burst);
    expect(burst).toHaveAttribute('data-playing', 'true');
  });

  it('hides the reveal again on collect without tearing it down', () => {
    render(<DailyChest userId="t" reducedMotion={false} onGranted={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(1300); });
    fireEvent.click(screen.getByTestId('academy-daily-chest'));
    act(() => { vi.advanceTimersByTime(460); });
    fireEvent.click(screen.getByText('academy.student.chestCollect'));
    const reveal = screen.getByTestId('academy-chest-reveal');
    expect(reveal.className).toContain('invisible');
    expect(screen.getByTestId('burst')).toHaveAttribute('data-playing', 'false');
  });

  it('still opens straight away when tapped before the hub went idle', () => {
    render(<DailyChest userId="u" reducedMotion={false} onGranted={vi.fn()} />);
    fireEvent.click(screen.getByTestId('academy-daily-chest'));
    expect(screen.getByTestId('academy-chest-reveal').className).not.toContain('invisible');
  });
});
