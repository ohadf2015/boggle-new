import { render, screen } from '@testing-library/react';
import { RankedTierBadge } from '../RankedTierBadge';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
    language: 'en',
  })),
}));

const mockUseRankedTier = vi.fn();
vi.mock('@/hooks/useRankedTier', () => ({
  useRankedTier: (...args: unknown[]) => mockUseRankedTier(...args),
}));

describe('RankedTierBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when elo is 0', () => {
    mockUseRankedTier.mockReturnValue({
      tier: { id: 'bronze', name: 'Bronze', color: '#CD7F32', minElo: 0, maxElo: 999 },
      elo: 0,
      progress: 0,
      nextTier: null,
    });

    const { container } = render(<RankedTierBadge />);
    expect(container.innerHTML).toBe('');
  });

  it('shows tier name and rating', () => {
    mockUseRankedTier.mockReturnValue({
      tier: { id: 'gold', name: 'Gold', color: '#FFD700', minElo: 1500, maxElo: 1999 },
      elo: 1650,
      progress: 0.3,
      nextTier: { id: 'platinum', name: 'Platinum', color: '#00FFFF' },
    });

    render(<RankedTierBadge />);

    expect(screen.getByTestId('ranked-tier-badge')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByText('1650')).toBeInTheDocument();
  });

  it('shows progress bar with correct aria attributes', () => {
    mockUseRankedTier.mockReturnValue({
      tier: { id: 'silver', name: 'Silver', color: '#C0C0C0', minElo: 1000, maxElo: 1499 },
      elo: 1250,
      progress: 0.5,
      nextTier: { id: 'gold', name: 'Gold', color: '#FFD700' },
    });

    render(<RankedTierBadge />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('renders tier icon with correct color', () => {
    mockUseRankedTier.mockReturnValue({
      tier: { id: 'gold', name: 'Gold', color: '#FFD700', minElo: 1500, maxElo: 1999 },
      elo: 1500,
      progress: 0,
      nextTier: null,
    });

    render(<RankedTierBadge />);

    const tierIcon = screen.getByTestId('tier-icon');
    expect(tierIcon).toBeInTheDocument();
    expect(tierIcon).toHaveStyle({ borderColor: '#FFD700' });
  });
});
