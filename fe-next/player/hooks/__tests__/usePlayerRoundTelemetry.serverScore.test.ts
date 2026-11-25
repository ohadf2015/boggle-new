// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { endCalls } = vi.hoisted(() => ({ endCalls: [] as Array<{ score: number }> }));
vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({ useCrazyGamesLifecycle: vi.fn() }));
vi.mock('@/hooks/useGameStartTelemetry', () => ({ useGameStartTelemetry: vi.fn() }));
vi.mock('@/hooks/useGameEndTelemetry', () => ({ useGameEndTelemetry: (args: { score: number }) => endCalls.push(args) }));

import { usePlayerRoundTelemetry } from '../usePlayerRoundTelemetry';

const base = {
  gameActive: false, waitingForResults: true, username: 'Ann', comboLevel: 0, tournamentData: null,
  gameModeConfirmed: true, gameCode: 'ABC123', humanPlayerCount: 2, botPlayerCount: 0,
};

describe('joiner game_completed score', () => {
  it('reports the server score for a Wheel Rush round, which never fills the classic word list', () => {
    endCalls.length = 0;
    renderHook(() => usePlayerRoundTelemetry({
      ...base, gameMode: 'wheel-rush',
      leaderboard: [{ username: 'Ann', score: 140 }, { username: 'Bob', score: 90 }] as never,
      foundWords: [] as never,
    }));
    expect(endCalls.at(-1)?.score).toBe(140);
  });

  it('falls back to the found words when the player is not on the leaderboard yet', () => {
    endCalls.length = 0;
    renderHook(() => usePlayerRoundTelemetry({
      ...base, gameMode: 'classic',
      leaderboard: [] as never,
      foundWords: [{ word: 'cat', score: 3 }, { word: 'dog', score: 4, validated: false }] as never,
    }));
    expect(endCalls.at(-1)?.score).toBe(3);
  });
});
