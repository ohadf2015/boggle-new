import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { OpponentWordFeedItem } from '@/hooks/useOpponentWordFeed';

const feedItemsMock = vi.fn<[], OpponentWordFeedItem[]>(() => []);
vi.mock('@/hooks/useOpponentWordFeed', () => ({
  useOpponentWordFeed: () => ({ feedItems: feedItemsMock() }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { OpponentWordFeedConnected } from '../OpponentWordFeedConnected';

const mockSocket = {} as any;

const mkT = (k: string, params?: Record<string, any>) => {
  if (k === 'multiplayer.opponentFoundWord') return `${params?.name} found ${params?.length}`;
  return k;
};

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

describe('OpponentWordFeedConnected', () => {
  beforeEach(() => {
    feedItemsMock.mockReset();
    feedItemsMock.mockReturnValue([]);
  });

  it('renders the feed container even when empty', () => {
    feedItemsMock.mockReturnValue([]);
    const { container } = render(
      <OpponentWordFeedConnected socket={mockSocket} currentPlayerName="me" t={mkT} />
    );
    expect(container.querySelector('[data-testid="opponent-word-feed"]')).toBeTruthy();
  });

  it('passes feedItems from hook to inner component', () => {
    feedItemsMock.mockReturnValue([
      mk({ playerName: 'Bob', wordLength: 4, score: 3 }),
    ]);
    render(<OpponentWordFeedConnected socket={mockSocket} currentPlayerName="me" t={mkT} />);
    expect(screen.getByText('Bob found 4')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
  });
});
