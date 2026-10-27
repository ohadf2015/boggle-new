/**
 * Once the Word Bridge daily run is over, "skip" goes (the results hand off to
 * the next quest). The chrome's back pill is the only back control on both
 * flavors' results, so it stays.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import DailyPageClient from '../DailyPageClient';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k, dir: 'ltr' }),
}));

const { finishButton } = vi.hoisted(() => ({ finishButton: (props: { onTerminal?: () => void }) => (
  <button type="button" data-testid="finish" onClick={() => props.onTerminal?.()} />
) }));
vi.mock('@/components/connections/ConnectionsDailyChallenge', () => ({ default: finishButton }));
vi.mock('@/components/connections/pyramid/PyramidChallenge', () => ({ default: finishButton }));

const variantMock = vi.fn(() => 'regular' as 'regular' | 'pyramid');
vi.mock('@/lib/connections/dailyVariant', () => ({
  dailyConnectionsVariant: () => variantMock(),
}));
vi.mock('@/lib/connections/pyramid/puzzles', () => ({
  getPyramidsForLocale: () => [{ id: 'p1' }],
}));

describe('DailyPageClient chrome after the run ends', () => {
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
    localStorage.setItem('lc:connections-daily-tutorial-seen', '1');
  });

  it('given a live 5-riddle run, then back and skip are offered', () => {
    variantMock.mockReturnValue('regular');
    render(<DailyPageClient locale="en" />);
    expect(screen.getByTestId('back-to-daily')).toBeTruthy();
    expect(screen.getByTestId('skip-optional')).toBeTruthy();
  });

  it('given the 5-riddle run ends, then skip goes but the back pill stays', () => {
    variantMock.mockReturnValue('regular');
    render(<DailyPageClient locale="en" />);
    fireEvent.click(screen.getByTestId('finish'));
    expect(screen.queryByTestId('skip-optional')).toBeNull();
    expect(screen.getByTestId('back-to-daily')).toBeTruthy();
  });

  it('given the pyramid run ends, then skip goes but the back pill stays', () => {
    variantMock.mockReturnValue('pyramid');
    render(<DailyPageClient locale="en" />);
    fireEvent.click(screen.getByTestId('finish'));
    expect(screen.queryByTestId('skip-optional')).toBeNull();
    expect(screen.getByTestId('back-to-daily')).toBeTruthy();
  });
});
