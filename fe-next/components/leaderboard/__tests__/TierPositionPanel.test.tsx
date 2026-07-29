import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TierPositionPanel from '../TierPositionPanel';
import type { TierPosition } from '@/hooks/useTierPosition';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      // Simulated translation strings for test
      const translations: Record<string, string> = {
        'leaderboard.tier.rankInTier': '#{{rank}} of {{total}} in {{tier}}',
        'leaderboard.tier.percentile': 'Top {{pct}}% in {{tier}}',
      };

      const template = translations[key] ?? key;
      if (!params) return template;

      let result = template;
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{{${k}}}`, String(v));
      }
      return result;
    },
    language: 'en',
  }),
}));

vi.mock('@/components/Avatar', () => ({
  default: ({ userId }: { userId?: string }) => <div data-testid={`avatar-${userId}`} />,
}));

const goldPosition: TierPosition = {
  tier_id: 'gold',
  rank_in_tier: 12,
  tier_population: 487,
  neighbors: [
    { player_id: 'p10', display_name: 'rivalA', total_score: 14200, avatar_image: null, avatar_config: null, rank_in_tier: 10 },
    { player_id: 'p11', display_name: 'rivalB', total_score: 13950, avatar_image: null, avatar_config: null, rank_in_tier: 11 },
    { player_id: 'me',  display_name: 'YOU',    total_score: 13420, avatar_image: null, avatar_config: null, rank_in_tier: 12 },
    { player_id: 'p13', display_name: 'rivalC', total_score: 12880, avatar_image: null, avatar_config: null, rank_in_tier: 13 },
    { player_id: 'p14', display_name: 'rivalD', total_score: 12510, avatar_image: null, avatar_config: null, rank_in_tier: 14 },
  ],
};

describe('TierPositionPanel — Gold happy path', () => {
  it('renders tier-rank as the primary number', () => {
    render(<TierPositionPanel position={goldPosition} userId="me" />);
    expect(screen.getByTestId('tier-rank-primary')).toHaveTextContent('#12 of 487 in gold');
  });

  it('renders percentile pill (12 / 487 ≈ top 2%)', () => {
    render(<TierPositionPanel position={goldPosition} userId="me" />);
    expect(screen.getByTestId('tier-percentile')).toHaveTextContent('Top 2% in gold');
  });

  it('renders 5 peer rows including the user highlighted', () => {
    render(<TierPositionPanel position={goldPosition} userId="me" />);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(screen.getByTestId('peer-row-me')).toHaveAttribute('data-current', 'true');
  });

  it('exposes accessible label on the tier-rank node', () => {
    render(<TierPositionPanel position={goldPosition} userId="me" />);
    expect(screen.getByLabelText('Rank 12 of 487 in gold tier')).toBeInTheDocument();
  });
});

const stonePosition: TierPosition = {
  tier_id: 'stone',
  rank_in_tier: 1893,
  tier_population: 8421,
  neighbors: [],
};

describe('TierPositionPanel — Stone tier', () => {
  it('hides the percentile pill', () => {
    render(<TierPositionPanel position={stonePosition} userId="me" />);
    expect(screen.queryByTestId('tier-percentile')).toBeNull();
  });

  it('shows the climb-to-next CTA chip', () => {
    render(<TierPositionPanel position={stonePosition} userId="me" />);
    expect(screen.getByTestId('tier-climb-cta')).toBeInTheDocument();
  });
});

const grandmasterPosition: TierPosition = {
  tier_id: 'grandmaster',
  rank_in_tier: 7,
  tier_population: 42,
  neighbors: [
    { player_id: 'gm1', display_name: 'topGM', total_score: 850000, avatar_image: null, avatar_config: null, rank_in_tier: 1 },
  ],
};

describe('TierPositionPanel — Grandmaster tier', () => {
  it('hides the percentile pill', () => {
    render(<TierPositionPanel position={grandmasterPosition} userId="me" />);
    expect(screen.queryByTestId('tier-percentile')).toBeNull();
  });

  it('shows the defend-throne label', () => {
    render(<TierPositionPanel position={grandmasterPosition} userId="me" />);
    expect(screen.getByTestId('tier-throne-label')).toBeInTheDocument();
  });
});

const firstInGold: TierPosition = {
  tier_id: 'gold',
  rank_in_tier: 1,
  tier_population: 487,
  neighbors: [
    { player_id: 'me',  display_name: 'YOU',    total_score: 29900, avatar_image: null, avatar_config: null, rank_in_tier: 1 },
    { player_id: 'p2',  display_name: 'rivalA', total_score: 28000, avatar_image: null, avatar_config: null, rank_in_tier: 2 },
    { player_id: 'p3',  display_name: 'rivalB', total_score: 27500, avatar_image: null, avatar_config: null, rank_in_tier: 3 },
  ],
};

describe('TierPositionPanel — first in tier', () => {
  it('applies the wobble animation class', () => {
    render(<TierPositionPanel position={firstInGold} userId="me" />);
    expect(screen.getByTestId('tier-rank-primary')).toHaveClass('animate-neo-wobble');
  });

  it('renders the nobody-above placeholder', () => {
    render(<TierPositionPanel position={firstInGold} userId="me" />);
    expect(screen.getByTestId('tier-nobody-above')).toBeInTheDocument();
  });
});
