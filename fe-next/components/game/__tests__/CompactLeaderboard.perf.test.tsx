/**
 * CompactLeaderboard performance optimizations
 *
 * Verifies:
 * 1. Per-player avatars render with disableEffects=true so the per-avatar
 *    tier animation wrapper (filter: drop-shadow loops, sparkles,
 *    conic-gradient ring) doesn't run during a match.
 * 2. The three previously-infinite framer-motion loops are replaced by
 *    CSS classes so they don't churn per-frame React updates.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => {
  const actual = vi.importActual('framer-motion');
  return {
    ...actual,
    m: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

vi.mock('../../Avatar', () => ({
  __esModule: true,
  default: ({ disableEffects }: { disableEffects?: boolean }) => (
    <div data-testid="avatar" data-disable-effects={disableEffects ? 'true' : 'false'} />
  ),
}));

import { CompactLeaderboard, CompactPlayer } from '../CompactLeaderboard';

const players: CompactPlayer[] = [
  { username: 'alice', score: 300, rank: 1 },
  { username: 'bob', score: 200, rank: 2 },
  { username: 'charlie', score: 100, rank: 3 },
  { username: 'me', score: 50, rank: 4 },
];

const t = (k: string) => k;

describe('CompactLeaderboard performance', () => {
  it('renders avatars with effects disabled (no per-avatar tier filter loop)', () => {
    render(<CompactLeaderboard players={players} currentUsername="me" t={t} />);
    const avatars = screen.getAllByTestId('avatar');
    expect(avatars.length).toBeGreaterThan(0);
    for (const a of avatars) {
      expect(a.getAttribute('data-disable-effects')).toBe('true');
    }
  });

  it('uses a CSS class for the header zap pulse (no framer-motion infinite loop)', () => {
    const { container } = render(
      <CompactLeaderboard players={players} currentUsername="me" t={t} />,
    );
    expect(container.querySelector('[data-anim="zap-wiggle"]')).toBeTruthy();
  });

  it('uses a CSS class for the "almost there" pulse (no framer-motion infinite loop)', () => {
    // Trigger almost-there: me 50, ahead 51 (delta = 1, ≤ 5)
    const closePlayers: CompactPlayer[] = [
      { username: 'leader', score: 51, rank: 1 },
      { username: 'me', score: 50, rank: 2 },
    ];
    const { container } = render(
      <CompactLeaderboard players={closePlayers} currentUsername="me" t={t} />,
    );
    expect(container.querySelector('[data-anim="overtake-pulse"]')).toBeTruthy();
  });
});
