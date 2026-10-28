import React from 'react';
import { render, screen, within } from '@testing-library/react';
import BlastResultsScene from '../BlastResultsScene';
import type { BlastPlayerStats } from '@/shared/types/game';
import { blastCollectionScore } from '@/shared/utils/blastCollectionScore';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) =>
      vars ? `${key} ${Object.values(vars).join(' ')}` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/components/blast/results/useBlastResultsReveal', () => ({ useBlastResultsReveal: vi.fn() }));

const stats = (over: Partial<BlastPlayerStats>): BlastPlayerStats => ({
  maxCombo: 0,
  gemsCollected: 0,
  wordsFound: [],
  bestWord: '',
  tilesCleared: 0,
  totalTileBonus: 0,
  boardClears: 0,
  ...over,
});

describe('BlastResultsScene', () => {
  const playerStats: Record<string, BlastPlayerStats> = {
    alice: stats({ maxCombo: 5, gemsCollected: 8, tilesCleared: 40, bestWord: 'BLASTER', boardClears: 2 }),
    bob: stats({ maxCombo: 3, gemsCollected: 4, tilesCleared: 22, bestWord: 'WORD', boardClears: 0 }),
  };
  const scores = { alice: 1200, bob: 800 };

  const renderScene = (
    currentUsername: string,
    ps: Record<string, BlastPlayerStats> = playerStats,
    sc: Record<string, number> = scores,
  ) => render(<BlastResultsScene playerStats={ps} scores={sc} currentUsername={currentUsername} />);

  it('elevates the current user blast stats into their own emphasized block', () => {
    renderScene('bob');
    const me = screen.getByTestId('blast-result-me');
    expect(me).toHaveTextContent('results.you'); // the YOU marker
  });

  it('shows diamonds and combo, and omits coin / bomb chips the MP payload does not carry', () => {
    renderScene('bob');
    const me = screen.getByTestId('blast-result-me');
    expect(within(me).getByTestId('blast-stat-diamonds')).toHaveTextContent('4');
    expect(within(me).getByTestId('blast-stat-combo')).toHaveTextContent('x3');
    expect(within(me).queryByTestId('blast-stat-coins')).toBeNull();
    expect(within(me).queryByTestId('blast-stat-bombs')).toBeNull();
  });

  it('re-adds the coins chip and the collection bonus when the MP payload carries them', () => {
    render(
      <BlastResultsScene
        playerStats={{ ...playerStats, bob: { ...playerStats.bob, coinsCollected: 9 } }}
        scores={scores}
        currentUsername="bob"
        collection={{ bob: blastCollectionScore({ coins: 9, diamonds: 1 }) }}
      />,
    );
    expect(screen.getByTestId('blast-stat-coins')).toHaveTextContent('9');
    expect(screen.getByTestId('blast-results-bonus')).toHaveTextContent('blast.mpResults.bonus 330');
  });

  it('reads diamondsCollected from MP stats', () => {
    renderScene('bob', { ...playerStats, bob: { ...playerStats.bob, diamondsCollected: 7 } });
    expect(screen.getByTestId('blast-stat-diamonds')).toHaveTextContent('7');
  });

  it('tells a trailing player how many points beat the player above', () => {
    renderScene('bob');
    const goal = screen.getByTestId('blast-results-next-goal');
    expect(goal.dataset.kind).toBe('rival');
    expect(goal).toHaveTextContent('blast.results.reveal.goalRival 401 alice');
  });

  it('tells the winner their margin over the runner-up', () => {
    renderScene('alice');
    expect(screen.getByTestId('blast-results-next-goal')).toHaveTextContent('blast.results.reveal.goalLead 400 bob');
  });

  it('does not repeat the score/placement already shown by the shared results hero', () => {
    // The hero above this scene owns rank + score + username; the blast scene
    // only contributes the blast-specific stat grid, so it must not duplicate
    // the score (avoids the "stacked me-card" redundancy).
    renderScene('bob');
    const me = screen.getByTestId('blast-result-me');
    expect(me).not.toHaveTextContent('800');
  });

  it('does NOT render opponent rows — BlastMpResults above already ranks every player', () => {
    // Dedup: the standings scene (BlastMpResults) lists rank·name·combo·score
    // for all opponents directly above this scene. Repeating them here as a
    // second list was the duplication; the blast scene now contributes only the
    // current player's blast-specific stat card.
    renderScene('bob');
    expect(screen.queryAllByTestId('blast-result-opponent')).toHaveLength(0);
    expect(screen.getByTestId('blast-result-me')).toBeInTheDocument();
  });

  it('surfaces the current user best word in their block', () => {
    renderScene('alice');
    expect(screen.getByTestId('blast-result-me')).toHaveTextContent('BLASTER');
  });

  it('shows only the me-block when the current user is the only player', () => {
    renderScene('alice', { alice: playerStats.alice }, { alice: 1200 });
    expect(screen.getByTestId('blast-result-me')).toBeInTheDocument();
    expect(screen.queryAllByTestId('blast-result-opponent')).toHaveLength(0);
  });

  it('renders without crashing with empty players', () => {
    const { container } = render(
      <BlastResultsScene playerStats={{}} scores={{}} currentUsername="alice" />
    );
    expect(container).toBeTruthy();
  });

  it('renders nothing when the current user is absent (spectator) — BlastMpResults owns standings', () => {
    const { container } = render(
      <BlastResultsScene playerStats={playerStats} scores={scores} currentUsername="zoe" />
    );
    expect(screen.queryByTestId('blast-result-me')).toBeNull();
    expect(screen.queryAllByTestId('blast-result-opponent')).toHaveLength(0);
    expect(container.textContent).toBe('');
  });

  it('displays the scene title', () => {
    renderScene('alice');
    expect(screen.getByText('blast.results.sceneTitle')).toBeInTheDocument();
  });
});
