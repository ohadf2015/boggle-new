/**
 * MP results — the rest of the room, in rooms bigger than four.
 *
 * The podium takes the top 3 and the consolation block was deliberately trimmed
 * to the current player's single row (see ConsolationRows.currentPlayer.test.tsx).
 * At four players that is complete: 3 + you = everyone. At fourteen it is not —
 * the results page renders FOUR of fourteen people and silently erases ranks 4–13.
 *
 * Ground truth (Supabase `game_sessions`): room QV57D3 ran 13→14→15→15→15→14 across
 * six rounds, and big rooms retain better than small ones. Ten of those fourteen
 * players finished a round and could not find a single other name besides their own.
 *
 * So the trim stays for small rooms and lifts once the room is bigger than four —
 * the same ">4 players" boundary the rest of this work uses.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return { ...actual, useReducedMotion: () => false };
});
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ variant: 'control' }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: () => {} }));
vi.mock('@/components/results/ResultsHeroSection', () => ({
  __esModule: true, default: () => <div data-testid="results-hero" />,
}));
vi.mock('@/components/results/ResultsPodium', () => ({
  __esModule: true, default: () => <div data-testid="results-podium" />,
}));
// Report the usernames it was handed so we can assert who survives the trim.
vi.mock('@/components/results/ConsolationRows', () => ({
  __esModule: true,
  default: ({ players, startRank, showAddFriend }: {
    players: { username: string }[];
    startRank?: number;
    showAddFriend?: boolean;
  }) => (
    <div
      data-testid="consolation-rows"
      data-usernames={players.map((p) => p.username).join(',')}
      data-start-rank={String(startRank ?? '')}
      data-show-add-friend={String(showAddFriend !== false)}
    />
  ),
}));
vi.mock('@/components/results/ResultsRivalsPanel', () => ({
  __esModule: true, default: () => <div data-testid="results-rivals-panel" />,
}));
vi.mock('@/components/results/HighlightsBar', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/MpBragCard', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ImprovementPanel', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/feedback/GameFeedback', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/multiplayer/NearRankTeaser', () => ({ NearRankTeaser: () => null }));
vi.mock('@/components/results/ResultsRevengeSection', () => ({ ResultsRevengeSection: () => null }));
vi.mock('@/components/results/SeriesStandingsBanner', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsWordsSection', () => ({ ResultsWordsSection: () => null }));
vi.mock('@/components/results/RewardsSummary', () => ({ __esModule: true, default: () => null }));
vi.mock('@/utils/consolationCrowns', () => ({ assignConsolationCrowns: () => [] }));

import { ResultsMainContent } from '../ResultsMainContent';

const mk = (username: string, score: number) => ({ username, score, allWords: [] });

/** N players, descending score so rank === index + 1. */
const field = (n: number) =>
  Array.from({ length: n }, (_, i) => mk(`P${i + 1}`, (n - i) * 10));

const baseProps = {
  nearMisses: [],
  isHost: false,
  onStartGame: vi.fn(),
  onMarkReady: vi.fn(),
  onExit: vi.fn(),
  winStreakData: null,
  isAuthenticated: true,
  currentPlayerValidWords: [{ word: 'test', score: 10 }],
  normalizeUsername: (n: any) => n || '',
  isBotsOnlyGame: false,
  isCurrentPlayerReady: false,
  readyUsernames: [],
  duplicateRuleDisabled: false,
  t: (k: string) => k,
} as any;

function renderField(n: number, meRank: number) {
  const scores = field(n);
  return render(
    <ResultsMainContent
      {...baseProps}
      sortedScores={scores}
      currentPlayerData={scores[meRank - 1]}
      currentPlayerRank={meRank}
      isCurrentUserWinner={meRank === 1}
      username={`P${meRank}`}
    />,
  );
}

describe('ResultsMainContent — the rest of the room', () => {
  it('shows every non-podium player in a 14-player room', () => {
    renderField(14, 10);
    const rows = screen.getByTestId('consolation-rows');
    const shown = rows.getAttribute('data-usernames')!.split(',');

    // Ranks 4..14 — everyone the podium did not already cover.
    expect(shown).toHaveLength(11);
    expect(shown[0]).toBe('P4');
    expect(shown[shown.length - 1]).toBe('P14');
    // Rivals who used to vanish entirely are present…
    expect(shown).toContain('P7');
    // …and so is the player.
    expect(shown).toContain('P10');
  });

  it('numbers the rest of the field from 4, not from the player rank', () => {
    renderField(14, 10);
    expect(screen.getByTestId('consolation-rows')).toHaveAttribute('data-start-rank', '4');
  });

  it('shows the field even when the player finished on the podium', () => {
    renderField(14, 2);
    const shown = screen.getByTestId('consolation-rows').getAttribute('data-usernames')!.split(',');
    expect(shown).toHaveLength(11);
    expect(shown).toContain('P14');
  });

  it('keeps the trimmed single row in a small room (podium + you is already everyone)', () => {
    renderField(4, 4);
    const shown = screen.getByTestId('consolation-rows').getAttribute('data-usernames')!.split(',');
    expect(shown).toEqual(['P4']);
    expect(screen.getByTestId('consolation-rows')).toHaveAttribute('data-start-rank', '4');
  });

  it('renders nothing extra for a 3-player room — the podium covers it', () => {
    renderField(3, 2);
    expect(screen.queryByTestId('consolation-rows')).not.toBeInTheDocument();
  });

  /**
   * `AddFriendBadge` renders per non-current row and calls `useFriends()`, which has
   * no shared cache: every instance runs its own `fetchAll()`, starts its own
   * online-status setInterval, and registers nine socket listeners. While the list
   * was the current player's single row the badge never rendered at all (it is gated
   * on `!isCurrent`), so widening the list to the whole field takes that from ZERO
   * instances to ten — ten friend fetches and ten pollers on results mount, plus ten
   * add-friend buttons on the surface this work is meant to de-clutter.
   */
  it('does not put an add-friend badge on every row of a big field', () => {
    renderField(14, 10);
    expect(screen.getByTestId('consolation-rows')).toHaveAttribute('data-show-add-friend', 'false');
  });

  it('keeps the badge available in the small-room single-row case', () => {
    renderField(4, 4);
    expect(screen.getByTestId('consolation-rows')).toHaveAttribute('data-show-add-friend', 'true');
  });
});
