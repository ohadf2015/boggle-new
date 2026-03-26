import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLeadChangeDetection } from '../useLeadChangeDetection';

interface LeaderboardPlayer {
  username: string;
  score: number;
}

describe('useLeadChangeDetection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null when leaderboard is empty', () => {
    const { result } = renderHook(() =>
      useLeadChangeDetection([], 'player1')
    );
    expect(result.current).toBeNull();
  });

  it('should return null when only one player', () => {
    const leaderboard: LeaderboardPlayer[] = [
      { username: 'player1', score: 10 },
    ];
    const { result } = renderHook(() =>
      useLeadChangeDetection(leaderboard, 'player1')
    );
    expect(result.current).toBeNull();
  });

  it('should return null on initial render (no previous leader to compare)', () => {
    const leaderboard: LeaderboardPlayer[] = [
      { username: 'player1', score: 10 },
      { username: 'player2', score: 5 },
    ];
    const { result } = renderHook(() =>
      useLeadChangeDetection(leaderboard, 'player1')
    );
    expect(result.current).toBeNull();
  });

  it('should return took-lead when current player takes the lead', () => {
    const initial: LeaderboardPlayer[] = [
      { username: 'player2', score: 10 },
      { username: 'player1', score: 5 },
    ];
    const { result, rerender } = renderHook(
      ({ leaderboard, username }) => useLeadChangeDetection(leaderboard, username),
      { initialProps: { leaderboard: initial, username: 'player1' } }
    );

    // Player1 overtakes player2
    const updated: LeaderboardPlayer[] = [
      { username: 'player1', score: 15 },
      { username: 'player2', score: 10 },
    ];
    rerender({ leaderboard: updated, username: 'player1' });

    expect(result.current).toEqual({
      type: 'took-lead',
      newLeader: 'player1',
      previousLeader: 'player2',
    });
  });

  it('should return lost-lead when current player loses the lead', () => {
    const initial: LeaderboardPlayer[] = [
      { username: 'player1', score: 10 },
      { username: 'player2', score: 5 },
    ];
    const { result, rerender } = renderHook(
      ({ leaderboard, username }) => useLeadChangeDetection(leaderboard, username),
      { initialProps: { leaderboard: initial, username: 'player1' } }
    );

    // Player2 overtakes player1
    const updated: LeaderboardPlayer[] = [
      { username: 'player2', score: 15 },
      { username: 'player1', score: 10 },
    ];
    rerender({ leaderboard: updated, username: 'player1' });

    expect(result.current).toEqual({
      type: 'lost-lead',
      newLeader: 'player2',
      previousLeader: 'player1',
    });
  });

  it('should return other-took-lead when lead changes but current player is not involved', () => {
    const initial: LeaderboardPlayer[] = [
      { username: 'player2', score: 10 },
      { username: 'player3', score: 8 },
      { username: 'player1', score: 3 },
    ];
    const { result, rerender } = renderHook(
      ({ leaderboard, username }) => useLeadChangeDetection(leaderboard, username),
      { initialProps: { leaderboard: initial, username: 'player1' } }
    );

    // Player3 overtakes player2, but player1 is still last
    const updated: LeaderboardPlayer[] = [
      { username: 'player3', score: 12 },
      { username: 'player2', score: 10 },
      { username: 'player1', score: 3 },
    ];
    rerender({ leaderboard: updated, username: 'player1' });

    expect(result.current).toEqual({
      type: 'other-took-lead',
      newLeader: 'player3',
      previousLeader: 'player2',
    });
  });

  it('should return null when leader stays the same', () => {
    const initial: LeaderboardPlayer[] = [
      { username: 'player1', score: 10 },
      { username: 'player2', score: 5 },
    ];
    const { result, rerender } = renderHook(
      ({ leaderboard, username }) => useLeadChangeDetection(leaderboard, username),
      { initialProps: { leaderboard: initial, username: 'player1' } }
    );

    // Player1 still leads, just scores changed
    const updated: LeaderboardPlayer[] = [
      { username: 'player1', score: 15 },
      { username: 'player2', score: 12 },
    ];
    rerender({ leaderboard: updated, username: 'player1' });

    expect(result.current).toBeNull();
  });

  it('should require at least 2 players with score > 0', () => {
    const initial: LeaderboardPlayer[] = [
      { username: 'player1', score: 5 },
      { username: 'player2', score: 0 },
    ];
    const { result, rerender } = renderHook(
      ({ leaderboard, username }) => useLeadChangeDetection(leaderboard, username),
      { initialProps: { leaderboard: initial, username: 'player2' } }
    );

    // Player2 gets score, but player1 still has 0-score originally
    // Actually this should be: scores update but only 1 has score > 0
    const updated: LeaderboardPlayer[] = [
      { username: 'player2', score: 10 },
      { username: 'player1', score: 0 },
    ];
    rerender({ leaderboard: updated, username: 'player2' });

    expect(result.current).toBeNull();
  });

  it('should respect 5-second cooldown between events', () => {
    const initial: LeaderboardPlayer[] = [
      { username: 'player2', score: 10 },
      { username: 'player1', score: 5 },
    ];
    const { result, rerender } = renderHook(
      ({ leaderboard, username }) => useLeadChangeDetection(leaderboard, username),
      { initialProps: { leaderboard: initial, username: 'player1' } }
    );

    // Player1 takes lead
    rerender({
      leaderboard: [
        { username: 'player1', score: 15 },
        { username: 'player2', score: 10 },
      ],
      username: 'player1',
    });
    expect(result.current).toEqual({ type: 'took-lead', newLeader: 'player1', previousLeader: 'player2' });

    // Auto-clear the event so we can detect cooldown suppression
    act(() => { vi.advanceTimersByTime(2500); });
    expect(result.current).toBeNull();

    // Player2 takes lead back (still within 5s cooldown — only 2.5s elapsed)
    rerender({
      leaderboard: [
        { username: 'player2', score: 20 },
        { username: 'player1', score: 15 },
      ],
      username: 'player1',
    });
    // Should stay null due to cooldown
    expect(result.current).toBeNull();

    // After total 5 seconds from first event, cooldown expires
    act(() => { vi.advanceTimersByTime(2500); });
    rerender({
      leaderboard: [
        { username: 'player1', score: 25 },
        { username: 'player2', score: 20 },
      ],
      username: 'player1',
    });
    expect(result.current).toEqual({ type: 'took-lead', newLeader: 'player1', previousLeader: 'player2' });
  });

  it('should auto-clear event after 2.5 seconds', () => {
    const initial: LeaderboardPlayer[] = [
      { username: 'player2', score: 10 },
      { username: 'player1', score: 5 },
    ];
    const { result, rerender } = renderHook(
      ({ leaderboard, username }) => useLeadChangeDetection(leaderboard, username),
      { initialProps: { leaderboard: initial, username: 'player1' } }
    );

    rerender({
      leaderboard: [
        { username: 'player1', score: 15 },
        { username: 'player2', score: 10 },
      ],
      username: 'player1',
    });
    expect(result.current).not.toBeNull();

    // After 2.5 seconds, event should auto-clear
    act(() => { vi.advanceTimersByTime(2500); });
    expect(result.current).toBeNull();
  });
});
