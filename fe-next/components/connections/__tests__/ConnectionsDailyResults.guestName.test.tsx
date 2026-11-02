import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { LeaderboardRow } from '@/lib/connections/dailyClient';
import ConnectionsDailyResults from '../ConnectionsDailyResults';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => ({ today: {}, streak: { current: 0, longest: 0 } }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn(), fireVictoryConfetti: vi.fn() }));
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => null }));
vi.mock('@/components/daily/results/NextQuestCta', () => ({ NextQuestCta: () => null }));
const slot = vi.hoisted(() => ({ props: null as null | { rank?: number | null; totalPlayers?: number | null; onRenamed: (n: string) => void } }));
vi.mock('@/components/daily/results/DailyGuestNameSlot', () => ({
  DailyGuestNameSlot: (p: NonNullable<typeof slot.props>) => {
    slot.props = p;
    return <div data-testid="guest-name-slot" />;
  },
}));

const row = (rank: number, name: string) =>
  ({ rank_position: rank, display_name: name, avatar_emoji: '😀', avatar_color: '#000', avatar_image: null, custom_avatar: null, score: 100, time_taken_seconds: 10, streak: 1, puzzles_solved: 3, language: 'en' }) as LeaderboardRow;

function renderResults(leaderboard?: { rows: LeaderboardRow[]; rank: number | null; totalPlayers: number; loading: boolean }) {
  return render(
    <ConnectionsDailyResults
      outcome="done"
      headline="Great"
      score={300}
      stats={[]}
      meter={null}
      celebrate={false}
      shareText="x"
      answerKey={{ puzzles: [], solvedIndices: new Set() }}
      ctaSource="connections_daily_results"
      leaderboard={leaderboard}
    />,
  );
}

describe('ConnectionsDailyResults — guest name', () => {
  it('Given the chain board, Then the guest name slot sits above it with rank and field size', () => {
    renderResults({ rows: [row(1, 'Ace'), row(2, 'Player')], rank: 2, totalPlayers: 2, loading: false });
    const nameSlot = screen.getByTestId('guest-name-slot');
    expect(nameSlot.compareDocumentPosition(screen.getByTestId('connections-leaderboard')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(slot.props).toMatchObject({ rank: 2, totalPlayers: 2 });
  });

  it('Given a guest renames, Then their own row on the board shows the new name', () => {
    renderResults({ rows: [row(1, 'Ace'), row(2, 'Player')], rank: 2, totalPlayers: 2, loading: false });
    act(() => slot.props?.onRenamed('Ohad'));
    expect(screen.getByText('Ohad')).toBeInTheDocument();
    expect(screen.getByText('Ace')).toBeInTheDocument();
    expect(screen.queryByText('Player')).toBeNull();
  });

  it('Given the pyramid (no board), Then the guest can still name their row', () => {
    renderResults(undefined);
    expect(screen.getByTestId('guest-name-slot')).toBeInTheDocument();
  });
});
