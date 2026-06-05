import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// t echoes the key so we can assert which rank/label keys are used.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: Record<string, string | number>) =>
      params ? `${k}:${JSON.stringify(params)}` : k,
    language: 'en',
    dir: 'ltr',
  }),
}));

import { CuratorRankCard } from '../CuratorRankCard';

describe('CuratorRankCard', () => {
  it('shows the Apprentice rank for a brand-new curator', () => {
    render(<CuratorRankCard points={0} />);
    expect(screen.getByText('curator.rank.apprentice')).toBeTruthy();
  });

  it('shows the correct rank for a mid-ladder point total', () => {
    render(<CuratorRankCard points={200} />);
    expect(screen.getByText('curator.rank.lexicographer')).toBeTruthy();
  });

  it('renders a progress bar at 0% for a fresh curator', () => {
    render(<CuratorRankCard points={0} />);
    const bar = screen.getByTestId('curator-rank-progress');
    expect(bar.style.width).toBe('0%');
  });

  it('renders a partially filled progress bar mid-rank', () => {
    // apprentice(0)→scribe(50); 25 points = 50% of the way
    render(<CuratorRankCard points={25} />);
    const bar = screen.getByTestId('curator-rank-progress');
    expect(bar.style.width).toBe('50%');
  });

  it('shows the maxed state and a full bar at the top rank', () => {
    render(<CuratorRankCard points={1500} />);
    expect(screen.getByText('curator.rank.loremaster')).toBeTruthy();
    expect(screen.getByText('curator.rank.maxed')).toBeTruthy();
    const bar = screen.getByTestId('curator-rank-progress');
    expect(bar.style.width).toBe('100%');
  });

  it('surfaces the current point total', () => {
    render(<CuratorRankCard points={42} />);
    // points label is t('curator.rank.points', { points: 42 })
    expect(screen.getByText(/curator\.rank\.points:.*42/)).toBeTruthy();
  });
});
