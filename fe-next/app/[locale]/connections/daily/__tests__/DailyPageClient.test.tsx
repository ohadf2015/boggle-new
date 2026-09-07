/**
 * DailyPageClient — the /connections/daily host must render the day's variant:
 * regular 5-riddle chain on 'regular' days, PyramidChallenge (with the daily
 * share path) on 'pyramid' days, and always fall back to the regular chain for
 * locales with no pyramid pool.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import DailyPageClient from '../DailyPageClient';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k, dir: 'ltr' }),
}));

vi.mock('@/components/connections/ConnectionsDailyChallenge', () => ({
  default: () => <div data-testid="regular-daily" />,
}));

const pyramidChallenge = vi.fn(() => <div data-testid="pyramid-daily" />);
vi.mock('@/components/connections/pyramid/PyramidChallenge', () => ({
  default: (props: { sharePath?: string }) => {
    pyramidChallenge(props);
    return <div data-testid="pyramid-daily" />;
  },
}));

// Harness the variant selector + the pyramid pool so the test controls both.
const variantMock = vi.fn(() => 'regular' as const);
vi.mock('@/lib/connections/dailyVariant', () => ({
  dailyConnectionsVariant: (d: string) => variantMock(d),
}));

const poolMock = vi.fn(() => [{ id: 'p1' }]);
vi.mock('@/lib/connections/pyramid/puzzles', () => ({
  getPyramidsForLocale: (l: string) => poolMock(l),
}));

describe('DailyPageClient variant host', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders the regular 5-riddle challenge on regular days', () => {
    variantMock.mockReturnValue('regular');
    render(<DailyPageClient locale="en" />);
    expect(screen.getByTestId('regular-daily')).toBeTruthy();
    expect(screen.queryByTestId('pyramid-daily')).toBeNull();
    expect(pyramidChallenge).not.toHaveBeenCalled();
  });

  it('renders the pyramid challenge with the daily share path on pyramid days', () => {
    variantMock.mockReturnValue('pyramid');
    render(<DailyPageClient locale="he" />);
    expect(screen.getByTestId('pyramid-daily')).toBeTruthy();
    expect(screen.queryByTestId('regular-daily')).toBeNull();
    expect(pyramidChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ sharePath: 'he/connections/daily' }),
    );
  });

  it('falls back to the regular chain when the locale has no pyramid pool', () => {
    variantMock.mockReturnValue('pyramid');
    poolMock.mockReturnValue([]);
    render(<DailyPageClient locale="ja" />);
    expect(screen.getByTestId('regular-daily')).toBeTruthy();
    expect(pyramidChallenge).not.toHaveBeenCalled();
  });
});
