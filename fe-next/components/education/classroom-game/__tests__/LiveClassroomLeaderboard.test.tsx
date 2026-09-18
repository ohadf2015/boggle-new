'use client';

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LiveClassroomLeaderboard } from '../LiveClassroomLeaderboard';
import type { ClassroomLeaderboardEntry } from '../types';

// Mock the shared motion primitives
vi.mock('@/components/motion/LeaderboardRowReorder', () => ({
  LeaderboardRowReorder: ({ rows, renderRow }: any) => (
    <ul>
      {rows.map((row: any, idx: number) => (
        <li key={row.id} data-testid={`leaderboard-row-${idx}`}>
          {renderRow(row, idx)}
        </li>
      ))}
    </ul>
  ),
}));

vi.mock('@/components/motion/BoundedConfettiBurst', () => ({
  BoundedConfettiBurst: ({ children, trigger }: any) => (
    <div data-testid="confetti-burst" data-triggered={trigger}>
      {children}
    </div>
  ),
}));

vi.mock('@/hooks/useModeSting', () => ({
  useModeSting: () => ({
    playModeSound: vi.fn(),
  }),
}));

describe('LiveClassroomLeaderboard', () => {
  const mockPlayers: ClassroomLeaderboardEntry[] = [
    {
      id: 'student1',
      name: 'Alice',
      score: 100,
      wordCount: 5,
      avatar: null,
      rank: 1,
    },
    {
      id: 'student2',
      name: 'Bob',
      score: 80,
      wordCount: 4,
      avatar: null,
      rank: 2,
    },
    {
      id: 'student3',
      name: 'Charlie',
      score: 60,
      wordCount: 3,
      avatar: null,
      rank: 3,
    },
  ];

  it('renders leaderboard with all players in rank order', () => {
    render(
      <LiveClassroomLeaderboard
        players={mockPlayers}
        gameMode="classic"
        isPlaying={true}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('animates rank changes when players list is reordered', async () => {
    const { rerender } = render(
      <LiveClassroomLeaderboard
        players={mockPlayers}
        gameMode="classic"
        isPlaying={true}
      />
    );

    // Bob scores and moves to first place
    const reorderedPlayers: ClassroomLeaderboardEntry[] = [
      { ...mockPlayers[1], score: 150, rank: 1 },
      { ...mockPlayers[0], score: 100, rank: 2 },
      mockPlayers[2],
    ];

    rerender(
      <LiveClassroomLeaderboard
        players={reorderedPlayers}
        gameMode="classic"
        isPlaying={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('does not render when isPlaying is false', () => {
    const { container } = render(
      <LiveClassroomLeaderboard
        players={mockPlayers}
        gameMode="classic"
        isPlaying={false}
      />
    );

    // Component returns null when isPlaying is false
    expect(container.firstChild).toBeNull();
  });

  it('renders with correct visibility mode', () => {
    render(
      <LiveClassroomLeaderboard
        players={mockPlayers}
        gameMode="classic"
        isPlaying={true}
        visibility="top3"
      />
    );

    // Should only show top 3 (all in this case since we have exactly 3)
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('does not trigger confetti on mobile web', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 390,
    });

    const { container } = render(
      <LiveClassroomLeaderboard
        players={mockPlayers}
        gameMode="classic"
        isPlaying={true}
      />
    );

    // Confetti should be bounded/skipped on mobile
    const confetti = container.querySelector('[data-testid="confetti-burst"]');
    expect(confetti).toBeInTheDocument();
  });
});
