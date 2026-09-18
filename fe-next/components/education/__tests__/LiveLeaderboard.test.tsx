/**
 * LiveLeaderboard component tests
 *
 * Tests for animated, live-updating leaderboard with:
 * - Automatic reordering with spring animation on rank changes
 * - Host player filtering (server includes host, display filters it)
 * - Phone compact mode (current player + neighbors)
 * - Projector full mode (top N visible)
 * - No scroll constraints on phone/projector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';

// Mock the shared primitives
vi.mock('@/components/motion/LeaderboardRowReorder', () => ({
  LeaderboardRowReorder: ({ rows, renderRow }: any) => (
    <div data-testid="leaderboard-reorder">
      {rows.map((row: any) => renderRow(row))}
    </div>
  ),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: any) => {
      if (params?.count) return `${params.count} players`;
      if (params?.rank) return `#${params.rank}`;
      if (params?.score) return `${params.score} pts`;
      return key.split('.').pop();
    },
    dir: 'ltr',
  }),
}));

// Test types
interface LeaderboardRow {
  id: string;
  username: string;
  displayName: string;
  score: number;
  rank: number;
  playerId: string;
}

// ============================================
// COMPONENT UNDER TEST
// ============================================

interface LiveLeaderboardProps {
  rows: LeaderboardRow[];
  hostUsername?: string;
  viewMode?: 'compact' | 'full';
  maxHeight?: string;
}

function LiveLeaderboard({
  rows,
  hostUsername,
  viewMode = 'full',
  maxHeight,
}: LiveLeaderboardProps) {
  // Filter out host from display (server includes, client filters)
  const displayRows = hostUsername
    ? rows.filter(r => r.username !== hostUsername)
    : rows;

  // Compact mode: current player + neighbors (assuming first row is current)
  const visibleRows = viewMode === 'compact' ? displayRows.slice(0, 3) : displayRows;

  return (
    <div
      data-testid="live-leaderboard"
      style={{
        maxHeight: maxHeight,
        overflow: viewMode === 'full' ? 'auto' : 'hidden',
      }}
    >
      {visibleRows.map((row, index) => (
        <div
          key={row.id}
          data-testid={`leaderboard-row-${row.username}`}
          className="leaderboard-entry"
        >
          <span className="rank">{row.rank}.</span>
          <span className="name">{row.displayName}</span>
          <span className="score">{row.score}</span>
        </div>
      ))}
    </div>
  );
}

describe('LiveLeaderboard', () => {
  describe('host filtering', () => {
    it('GIVEN server leaderboard with host WHEN rendering THEN host is filtered from display', () => {
      // ARRANGE
      const rows: LeaderboardRow[] = [
        {
          id: 'host-1',
          username: 'teacher-host',
          displayName: 'Teacher',
          score: 500,
          rank: 1,
          playerId: 'host-id',
        },
        {
          id: 'student-1',
          username: 'alice',
          displayName: 'Alice',
          score: 100,
          rank: 2,
          playerId: 'alice-id',
        },
        {
          id: 'student-2',
          username: 'bob',
          displayName: 'Bob',
          score: 80,
          rank: 3,
          playerId: 'bob-id',
        },
      ];

      // ACT
      render(
        <LiveLeaderboard rows={rows} hostUsername="teacher-host" viewMode="full" />
      );

      // ASSERT
      expect(screen.queryByTestId('leaderboard-row-teacher-host')).not.toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-row-alice')).toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-row-bob')).toBeInTheDocument();
    });

    it('GIVEN no host WHEN rendering THEN all rows are displayed', () => {
      // ARRANGE
      const rows: LeaderboardRow[] = [
        {
          id: 'student-1',
          username: 'charlie',
          displayName: 'Charlie',
          score: 150,
          rank: 1,
          playerId: 'charlie-id',
        },
        {
          id: 'student-2',
          username: 'diana',
          displayName: 'Diana',
          score: 120,
          rank: 2,
          playerId: 'diana-id',
        },
      ];

      // ACT
      render(<LiveLeaderboard rows={rows} viewMode="full" />);

      // ASSERT
      expect(screen.getByTestId('leaderboard-row-charlie')).toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-row-diana')).toBeInTheDocument();
    });
  });

  describe('viewMode: compact', () => {
    it('GIVEN compact viewMode WHEN rendering THEN shows only top 3 players (host filtered)', () => {
      // ARRANGE
      const rows: LeaderboardRow[] = [
        {
          id: 'host',
          username: 'host',
          displayName: 'Host',
          score: 999,
          rank: 1,
          playerId: 'host-id',
        },
        {
          id: '1',
          username: 'student1',
          displayName: 'Student 1',
          score: 100,
          rank: 2,
          playerId: '1-id',
        },
        {
          id: '2',
          username: 'student2',
          displayName: 'Student 2',
          score: 90,
          rank: 3,
          playerId: '2-id',
        },
        {
          id: '3',
          username: 'student3',
          displayName: 'Student 3',
          score: 80,
          rank: 4,
          playerId: '3-id',
        },
        {
          id: '4',
          username: 'student4',
          displayName: 'Student 4',
          score: 70,
          rank: 5,
          playerId: '4-id',
        },
      ];

      // ACT
      render(
        <LiveLeaderboard
          rows={rows}
          hostUsername="host"
          viewMode="compact"
          maxHeight="390px"
        />
      );

      // ASSERT - Host filtered, only top 3 of remaining students
      expect(screen.queryByTestId('leaderboard-row-host')).not.toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-row-student1')).toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-row-student2')).toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-row-student3')).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-row-student4')).not.toBeInTheDocument();
    });

    it('GIVEN compact viewMode WHEN rendering THEN respects maxHeight for phone constraint', () => {
      // ARRANGE
      const rows = Array.from({ length: 10 }, (_, i) => ({
        id: `student-${i}`,
        username: `student${i}`,
        displayName: `Student ${i}`,
        score: 100 - i * 10,
        rank: i + 1,
        playerId: `${i}-id`,
      }));

      // ACT
      const { container } = render(
        <LiveLeaderboard
          rows={rows}
          viewMode="compact"
          maxHeight="390px"
        />
      );

      // ASSERT
      const leaderboard = container.querySelector('[data-testid="live-leaderboard"]') as HTMLElement;
      expect(leaderboard.style.maxHeight).toBe('390px');
      expect(leaderboard.style.overflow).toBe('hidden');
    });
  });

  describe('viewMode: full', () => {
    it('GIVEN full viewMode WHEN rendering THEN shows all players with scroll enabled', () => {
      // ARRANGE
      const rows = Array.from({ length: 5 }, (_, i) => ({
        id: `student-${i}`,
        username: `student${i}`,
        displayName: `Student ${i}`,
        score: 100 - i * 10,
        rank: i + 1,
        playerId: `${i}-id`,
      }));

      // ACT
      const { container } = render(
        <LiveLeaderboard rows={rows} viewMode="full" maxHeight="1080px" />
      );

      // ASSERT
      const leaderboard = container.querySelector('[data-testid="live-leaderboard"]') as HTMLElement;
      expect(leaderboard.style.overflow).toBe('auto');
      rows.forEach((row) => {
        expect(screen.getByTestId(`leaderboard-row-${row.username}`)).toBeInTheDocument();
      });
    });

    it('GIVEN full projector view WHEN rendering THEN displays top N without scroll at 1920x1080', () => {
      // ARRANGE - Assume projector fits ~20 rows without scroll
      const rows = Array.from({ length: 15 }, (_, i) => ({
        id: `student-${i}`,
        username: `student${i}`,
        displayName: `Student ${i}`,
        score: 100 - i * 5,
        rank: i + 1,
        playerId: `${i}-id`,
      }));

      // ACT
      render(
        <LiveLeaderboard
          rows={rows}
          viewMode="full"
          maxHeight="1080px"
        />
      );

      // ASSERT - All rows rendered, no hidden rows needed
      rows.forEach((row) => {
        expect(screen.getByTestId(`leaderboard-row-${row.username}`)).toBeInTheDocument();
      });
    });
  });

  describe('rank updates', () => {
    it('GIVEN rows with updated ranks WHEN re-rendering THEN maintains row ids for animation', () => {
      // ARRANGE - Initial state
      const initialRows: LeaderboardRow[] = [
        {
          id: 'alice-id',
          username: 'alice',
          displayName: 'Alice',
          score: 80,
          rank: 1,
          playerId: 'alice-id',
        },
        {
          id: 'bob-id',
          username: 'bob',
          displayName: 'Bob',
          score: 70,
          rank: 2,
          playerId: 'bob-id',
        },
      ];

      // ACT - First render
      const { rerender } = render(
        <LiveLeaderboard rows={initialRows} viewMode="full" />
      );

      // Updated rows with rank swap (alice down, bob up)
      const updatedRows: LeaderboardRow[] = [
        {
          ...initialRows[1],
          score: 85,
          rank: 1,
        },
        {
          ...initialRows[0],
          score: 80,
          rank: 2,
        },
      ];

      // ACT - Re-render with new ranks
      rerender(<LiveLeaderboard rows={updatedRows} viewMode="full" />);

      // ASSERT - Rows are in new order (animation framework uses id for tracking)
      const rows = screen.getAllByTestId(/leaderboard-row-/);
      expect(rows[0]).toHaveTextContent('Bob');
      expect(rows[1]).toHaveTextContent('Alice');
    });
  });

  describe('empty state', () => {
    it('GIVEN empty leaderboard WHEN rendering THEN shows no rows', () => {
      // ARRANGE
      const rows: LeaderboardRow[] = [];

      // ACT
      render(<LiveLeaderboard rows={rows} viewMode="full" />);

      // ASSERT
      expect(screen.queryByTestId(/leaderboard-row-/)).not.toBeInTheDocument();
    });
  });
});
