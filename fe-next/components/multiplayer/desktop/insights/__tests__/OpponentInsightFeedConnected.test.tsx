import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { OpponentWordFeedItem } from '@/hooks/useOpponentWordFeed';

// Mock useOpponentWordFeed so we control feedItems without socket setup
const feedItemsMock = vi.fn<[], OpponentWordFeedItem[]>(() => []);
vi.mock('@/hooks/useOpponentWordFeed', () => ({
  useOpponentWordFeed: () => ({ feedItems: feedItemsMock() }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

import { OpponentInsightFeedConnected } from '../OpponentInsightFeedConnected';

const mockSocket = {} as any;

const mk = (overrides: Partial<OpponentWordFeedItem> = {}): OpponentWordFeedItem => ({
  id: overrides.id ?? `id-${Math.random()}`,
  playerId: overrides.playerId ?? 'p',
  playerName: overrides.playerName ?? 'Alice',
  wordLength: overrides.wordLength ?? 5,
  firstLetter: overrides.firstLetter ?? 'A',
  lastLetter: overrides.lastLetter ?? 'E',
  score: overrides.score ?? 4,
  isLongWord: overrides.isLongWord ?? false,
  timestamp: overrides.timestamp ?? 0,
});

describe('OpponentInsightFeedConnected', () => {
  beforeEach(() => {
    feedItemsMock.mockReset();
    feedItemsMock.mockReturnValue([]);
  });

  it('renders nothing when feed is empty', () => {
    feedItemsMock.mockReturnValue([]);
    const { container } = render(
      <OpponentInsightFeedConnected
        socket={mockSocket}
        currentPlayerName="me"
        mode="classic"
      />
    );
    // empty-feed → component returns null
    expect(container.firstChild).toBeNull();
  });

  it('maps feedItems → OpponentInsightFeed opponentWords shape', () => {
    feedItemsMock.mockReturnValue([
      mk({ id: 'a', playerName: 'Alice', wordLength: 3, firstLetter: 'C', lastLetter: 'T', score: 6, timestamp: 10 }),
    ]);
    render(
      <OpponentInsightFeedConnected
        socket={mockSocket}
        currentPlayerName="me"
        mode="classic"
      />
    );
    // OpponentInsightFeed uses byUsername + score → "+6" + masked word "C·T"
    expect(screen.getByTestId('opponent-row-C·T')).toBeInTheDocument();
    expect(screen.getByText('+6')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('honors maxItems prop', () => {
    feedItemsMock.mockReturnValue(
      Array.from({ length: 5 }, (_, i) => mk({ id: `i-${i}`, timestamp: i }))
    );
    render(
      <OpponentInsightFeedConnected
        socket={mockSocket}
        currentPlayerName="me"
        mode="classic"
        maxItems={2}
      />
    );
    const rows = screen.getAllByTestId(/opponent-row-/);
    expect(rows.length).toBe(2);
  });
});
