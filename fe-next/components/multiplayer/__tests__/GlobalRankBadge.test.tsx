/**
 * GlobalRankBadge Component Tests
 *
 * Shows player percentile against the global player base in the MP
 * results hero section — separate signal from match-only ranking.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

const mockT = vi.fn((
  key: string,
  fallbackOrParams?: string | Record<string, string | number>,
  paramsWhenFallback?: Record<string, string | number>
) => {
  const map: Record<string, string> = {
    'globalRank.top': 'Top {{percentile}}% globally',
    'globalRank.behind': '{{count}} players behind you',
    'globalRank.socialProof': 'Joined {{count}} players today',
    'globalRank.aboveYourNorm': '+{{delta}}% above your average',
    'globalRank.belowYourNorm': '{{delta}}% below your average',
  };
  const tpl = map[key] || key;
  const params = typeof fallbackOrParams === 'object' && fallbackOrParams !== null
    ? fallbackOrParams
    : (paramsWhenFallback || {});
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replace(`{{${k}}}`, String(v)).replace(`{${k}}`, String(v)),
    tpl
  );
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en', dir: 'ltr' }),
}));

const mockUsePlayerPercentile = vi.fn();
vi.mock('@/hooks/usePlayerPercentile', () => ({
  usePlayerPercentile: () => mockUsePlayerPercentile(),
}));

import { GlobalRankBadge } from '../GlobalRankBadge';

describe('GlobalRankBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing while loading', () => {
    mockUsePlayerPercentile.mockReturnValue({ data: null, isLoading: true });
    const { container } = render(<GlobalRankBadge userId="abc" matchScore={100} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no userId provided', () => {
    mockUsePlayerPercentile.mockReturnValue({ data: null, isLoading: false });
    const { container } = render(<GlobalRankBadge userId={null} matchScore={100} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows percentile + behind-count for established players (totalGames >= 5)', () => {
    mockUsePlayerPercentile.mockReturnValue({
      data: { percentile: 27, totalGames: 42, totalScore: 5000, totalPlayersAbove: 4231 },
      isLoading: false,
    });
    render(<GlobalRankBadge userId="abc" matchScore={120} />);
    expect(screen.getByText(/Top 27% globally/i)).toBeInTheDocument();
  });

  it('shows social-proof copy for new players (totalGames < 5)', () => {
    mockUsePlayerPercentile.mockReturnValue({
      data: { percentile: 99, totalGames: 2, totalScore: 30, totalPlayersAbove: 0 },
      isLoading: false,
    });
    render(<GlobalRankBadge userId="abc" matchScore={20} />);
    expect(screen.queryByText(/Top 99/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('global-rank-social-proof')).toBeInTheDocument();
  });

  it('shows above-your-norm hint when match score beats personal average', () => {
    mockUsePlayerPercentile.mockReturnValue({
      data: { percentile: 30, totalGames: 50, totalScore: 5000, totalPlayersAbove: 100 },
      isLoading: false,
    });
    // Avg = 5000 / 50 = 100. Match 120 = +20% above avg.
    render(<GlobalRankBadge userId="abc" matchScore={120} />);
    expect(screen.getByText(/above your average/i)).toBeInTheDocument();
  });

  it('omits norm hint when match score equals or undershoots average', () => {
    mockUsePlayerPercentile.mockReturnValue({
      data: { percentile: 30, totalGames: 50, totalScore: 5000, totalPlayersAbove: 100 },
      isLoading: false,
    });
    render(<GlobalRankBadge userId="abc" matchScore={100} />);
    expect(screen.queryByText(/above your average/i)).not.toBeInTheDocument();
  });
});
