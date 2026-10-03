import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/education/duels/LiveClassroomLeaderboard', () => ({
  __esModule: true,
  default: ({ className }: { className?: string }) => <div data-testid="live-board" className={className} />,
}));

import TvLeaderboard from '../TvLeaderboard';

describe('TvLeaderboard — classroom standings past the fold', () => {
  it('Given more students than fit the card, Then the standings list scrolls instead of clipping', () => {
    const players = Array.from({ length: 12 }, (_, i) => ({ username: `S${i}`, score: i, wordCount: 0 }));
    render(<TvLeaderboard players={players} classroom t={(k) => k} />);
    expect(screen.getByTestId('live-board').className).toContain('overflow-y-auto');
  });
});
