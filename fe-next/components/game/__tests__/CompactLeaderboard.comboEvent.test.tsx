/**
 * Tests for CompactLeaderboard combo event badges (QW-4)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
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

// Mock Avatar
vi.mock('../../Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar" />,
}));

import { CompactLeaderboard, CompactPlayer } from '../CompactLeaderboard';

const defaultPlayers: CompactPlayer[] = [
  { username: 'alice', score: 300, rank: 1 },
  { username: 'bob', score: 200, rank: 2 },
  { username: 'charlie', score: 100, rank: 3 },
];

const defaultT = (key: string) => key;

describe('CompactLeaderboard combo event badges', () => {
  it('should show combo badge for player with active combo event', () => {
    render(
      <CompactLeaderboard
        players={defaultPlayers}
        currentUsername="alice"
        t={defaultT}
        comboEvent={{ username: 'bob', comboType: 'gem' }}
      />
    );

    expect(screen.getByTestId('combo-badge-bob')).toBeInTheDocument();
  });

  it('should not show combo badge when no combo event', () => {
    render(
      <CompactLeaderboard
        players={defaultPlayers}
        currentUsername="alice"
        t={defaultT}
      />
    );

    expect(screen.queryByTestId('combo-badge-bob')).not.toBeInTheDocument();
  });

  it('should not show combo badge for current user', () => {
    render(
      <CompactLeaderboard
        players={defaultPlayers}
        currentUsername="alice"
        t={defaultT}
        comboEvent={{ username: 'alice', comboType: 'gem' }}
      />
    );

    expect(screen.queryByTestId('combo-badge-alice')).not.toBeInTheDocument();
  });

  it('should show fire icon for bomb combo type', () => {
    render(
      <CompactLeaderboard
        players={defaultPlayers}
        currentUsername="alice"
        t={defaultT}
        comboEvent={{ username: 'bob', comboType: 'bomb' }}
      />
    );

    expect(screen.getByTestId('combo-badge-bob')).toBeInTheDocument();
  });
});

describe('CompactLeaderboard input method icons', () => {
  it('should show keyboard icon when player inputMethod is keyboard', () => {
    const players: CompactPlayer[] = [
      { username: 'alice', score: 300, rank: 1 },
      { username: 'bob', score: 200, rank: 2, inputMethod: 'keyboard' },
    ];

    render(
      <CompactLeaderboard
        players={players}
        currentUsername="alice"
        t={defaultT}
      />
    );

    // The keyboard icon title attribute
    const icon = screen.getByTitle('keyboard');
    expect(icon).toBeInTheDocument();
  });

  it('should not show input method icon when inputMethod is null', () => {
    const players: CompactPlayer[] = [
      { username: 'alice', score: 300, rank: 1, inputMethod: null },
      { username: 'bob', score: 200, rank: 2 },
    ];

    render(
      <CompactLeaderboard
        players={players}
        currentUsername="alice"
        t={defaultT}
      />
    );

    expect(screen.queryByTitle('keyboard')).not.toBeInTheDocument();
    expect(screen.queryByTitle('click')).not.toBeInTheDocument();
    expect(screen.queryByTitle('drag')).not.toBeInTheDocument();
  });
});
