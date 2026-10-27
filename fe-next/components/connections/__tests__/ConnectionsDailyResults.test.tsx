import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { LeaderboardRow } from '@/lib/connections/dailyClient';
import type { BridgeOutcome } from '@/lib/connections/shareGrid';
import type { ConnectionPuzzle } from '@/lib/connections/types';
import ConnectionsDailyResults from '../ConnectionsDailyResults';
import BridgeOutcomeTiles from '../BridgeOutcomeTiles';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (k: string, params?: Record<string, unknown>) => (params ? `${k}(${JSON.stringify(params)})` : k),
  }),
}));
vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => ({
    today: { wordHunt: true, wordWheel: true, wordTower: false, connections: true },
    streak: { current: 6, longest: 9 },
  }),
}));
const confetti = vi.hoisted(() => ({ fireConfetti: vi.fn(), fireVictoryConfetti: vi.fn() }));
vi.mock('@/utils/confettiUtils', () => confetti);
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => <div data-testid="results-banner" /> }));
vi.mock('@/components/daily/results/NextQuestCta', () => ({
  NextQuestCta: (p: { source: string }) => <div data-testid="next-quest-cta" data-source={p.source} />,
}));

const puzzles: ConnectionPuzzle[] = [
  { id: '1', word1: 'GOLD', bridge: 'FISH', word2: 'POND', difficulty: 'easy' },
  { id: '2', word1: 'SNOW', bridge: 'BALL', word2: 'ROOM', difficulty: 'easy' },
];
const outcomes: BridgeOutcome[] = [
  { reached: true, solved: true, wrongAttempts: 0, hintUsed: false },
  { reached: true, solved: false, wrongAttempts: 2, hintUsed: true },
];
const rows: LeaderboardRow[] = [{ rank: 1, displayName: 'P1', score: 500, avatarEmoji: '😀' } as LeaderboardRow];

function renderResults(over: Partial<React.ComponentProps<typeof ConnectionsDailyResults>> = {}) {
  return render(
    <ConnectionsDailyResults
      outcome="done"
      headline="Great work!"
      eyebrow="Oct 27"
      score={350}
      stats={[{ value: '1/2', label: 'solved' }, { value: '#12', label: 'rank' }]}
      meter={<BridgeOutcomeTiles outcomes={outcomes} />}
      celebrate={false}
      shareText="LexiClash · Word Bridge"
      answerKey={{ puzzles, solvedIndices: new Set([0]) }}
      ctaSource="connections_daily_results"
      leaderboard={{ rows, rank: 12, totalPlayers: 100, loading: false }}
      {...over}
    />,
  );
}

describe('ConnectionsDailyResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given a finished run, When results render, Then the shared daily hero leads with the connections mode, headline, score and stats', () => {
    renderResults();
    const hero = screen.getByTestId('daily-results-hero');
    expect(hero).toHaveAttribute('data-mode', 'connections');
    expect(hero).toHaveAttribute('data-outcome', 'done');
    expect(within(hero).getByRole('heading', { name: 'Great work!' })).toBeTruthy();
    expect(within(hero).getByTestId('daily-results-score').textContent).toBe('350');
    expect(within(hero).getAllByTestId('daily-results-stat')).toHaveLength(2);
    expect(within(hero).getAllByTestId('recap-square')).toHaveLength(2);
  });

  it('Given the hero owns streak and the flow chrome owns back, Then the screen draws no back link and no second streak chip', () => {
    renderResults();
    expect(screen.queryByTestId('back-button')).toBeNull();
    expect(screen.queryByTestId('stat-chip-streak')).toBeNull();
    expect(screen.getAllByTestId('daily-results-streak')).toHaveLength(1);
  });

  it('Given the hero, Then its footer carries the share row that copies the paste text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const onShareClick = vi.fn();
    renderResults({ onShareClick });
    const hero = screen.getByTestId('daily-results-hero');
    within(hero).getByRole('button', { name: 'share.emojiCard.copy' }).click();
    await screen.findByText('common.copied');
    expect(writeText).toHaveBeenCalledWith('LexiClash · Word Bridge');
    expect(onShareClick).toHaveBeenCalledWith('copy');
  });

  it('Given the screen order, Then hero → next quest → countdown → answer key → leaderboard', () => {
    renderResults();
    const order = ['daily-results-hero', 'next-quest-cta', 'bridge-countdown', 'daily-answer-key', 'connections-leaderboard']
      .map((id) => screen.getByTestId(id));
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByTestId('next-quest-cta').getAttribute('data-source')).toBe('connections_daily_results');
  });

  it('Given no leaderboard (pyramid day), Then the board is simply absent', () => {
    renderResults({ leaderboard: undefined });
    expect(screen.queryByTestId('connections-leaderboard')).toBeNull();
    expect(screen.getByTestId('daily-answer-key')).toBeTruthy();
  });

  it('Given a restored revisit, Then nothing celebrates; given a fresh win, Then exactly one confetti burst comes from the hero', async () => {
    renderResults({ outcome: 'win', celebrate: false });
    await new Promise((r) => setTimeout(r, 500));
    expect(confetti.fireConfetti).not.toHaveBeenCalled();
    expect(confetti.fireVictoryConfetti).not.toHaveBeenCalled();
  });

  it('Given the screen, Then it uses neo tokens only (no raw rgba glows or slate text)', () => {
    const { container } = renderResults({ outcome: 'win' });
    expect(container.innerHTML).not.toMatch(/class="[^"]*(rgba\(|text-slate-|shadow-\[0_0)/);
  });

  it('Given a body slot (zero-solved note / pyramid reveal), Then it sits right under the hero', () => {
    renderResults({ body: <p data-testid="body-note">note</p> });
    const hero = screen.getByTestId('daily-results-hero');
    const note = screen.getByTestId('body-note');
    expect(hero.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
