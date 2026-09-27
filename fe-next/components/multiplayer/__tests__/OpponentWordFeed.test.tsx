/**
 * OpponentWordFeed Component Tests
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OpponentWordFeed } from '../OpponentWordFeed';
import type { OpponentWordFeedItem } from '@/hooks/useOpponentWordFeed';

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockT = (key: string, params?: Record<string, any>) => {
  if (key === 'multiplayer.opponentFoundWord') {
    return `${params?.name} found a ${params?.length}-letter word!`;
  }
  if (key === 'multiplayer.opponentFoundLongWord') {
    return `${params?.name} found a ${params?.length}-letter word! fire`;
  }
  return key;
};

const makeFeedItem = (overrides?: Partial<OpponentWordFeedItem>): OpponentWordFeedItem => ({
  id: `item-${Math.random()}`,
  playerId: 'p1',
  playerName: 'Alice',
  wordLength: 5,
  firstLetter: 'H',
  lastLetter: 'O',
  score: 4,
  isLongWord: false,
  timestamp: Date.now(),
  ...overrides,
});

describe('OpponentWordFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when feedItems is empty', () => {
    const { container } = render(
      <OpponentWordFeed feedItems={[]} t={mockT} />
    );
    expect(container.querySelector('[data-testid="opponent-word-feed"]')).toBeTruthy();
    expect(screen.queryByText(/found a/)).toBeNull();
  });

  it('should render feed items', () => {
    const items = [makeFeedItem({ playerName: 'Bob', wordLength: 4, score: 3 })];
    render(<OpponentWordFeed feedItems={items} t={mockT} />);
    expect(screen.getByText(/Bob found a 4-letter word!/)).toBeTruthy();
  });

  it('should show max 4 visible entries', () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      makeFeedItem({ id: `item-${i}`, playerName: `P${i}`, wordLength: 4, score: 3 })
    );
    render(<OpponentWordFeed feedItems={items} t={mockT} />);
    // Only last 4 should be visible
    const entries = screen.getAllByText(/found a/);
    expect(entries.length).toBe(4);
  });

  it('should use long word translation for 6+ letter words', () => {
    const items = [makeFeedItem({ wordLength: 7, isLongWord: true })];
    render(<OpponentWordFeed feedItems={items} t={mockT} />);
    expect(screen.getByText(/fire/)).toBeTruthy();
  });

  it('should have pointer-events-none style', () => {
    const { container } = render(
      <OpponentWordFeed feedItems={[]} t={mockT} />
    );
    const feed = container.querySelector('[data-testid="opponent-word-feed"]');
    expect(feed?.className).toContain('pointer-events-none');
  });

  it('should show score for each entry', () => {
    const items = [makeFeedItem({ score: 8 })];
    render(<OpponentWordFeed feedItems={items} t={mockT} />);
    expect(screen.getByText(/\+8/)).toBeTruthy();
  });
});
