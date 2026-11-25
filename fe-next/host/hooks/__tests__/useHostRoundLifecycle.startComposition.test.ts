// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { startCalls } = vi.hoisted(() => ({ startCalls: [] as Array<{ extras: Record<string, unknown> }> }));
vi.mock('@/hooks/useGameStartTelemetry', () => ({ useGameStartTelemetry: (a: { extras: Record<string, unknown> }) => startCalls.push(a) }));
vi.mock('@/hooks/useGameEndTelemetry', () => ({ useGameEndTelemetry: vi.fn() }));
vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({ useCrazyGamesLifecycle: vi.fn() }));
vi.mock('@/hooks/useNavigationGuard', () => ({ useNavigationGuard: vi.fn() }));
vi.mock('@/hooks/useEarthquakeFireRound', () => ({ useEarthquakeFireRound: vi.fn() }));
vi.mock('../useHostPendingGameStart', () => ({ useHostPendingGameStart: vi.fn() }));
vi.mock('../index', () => ({}));
vi.mock('@/utils/SocketContext', () => ({}));
vi.mock('@/contexts/LanguageContext', () => ({}));
vi.mock('@/contexts/MusicContext', () => ({}));

import { useHostRoundLifecycle } from '../useHostRoundLifecycle';

describe('host game_started composition', () => {
  it('counts humans and bots from the lobby roster, which exists at start (final scores do not yet)', () => {
    const state = {
      runtime: { gameStarted: true, waitingForResults: false, remainingTime: 60 },
      players: {
        playerScores: {},
        playersReady: [
          { username: 'Host', isHost: true },
          { username: 'Bot A', isBot: true },
          { username: 'Bot B', isBot: true },
        ],
      },
      tournament: { finalScores: null, tournamentData: null },
      combo: { level: 0 },
      settings: { timerValue: 1, difficulty: 'normal' },
      roomLanguage: 'en',
      setShowExitConfirm: vi.fn(),
    };
    renderHook(() => useHostRoundLifecycle({
      state: state as never, actions: { leaving: false, confirmExitRoom: vi.fn() } as never,
      fadeToTrack: vi.fn(), TRACKS: { IN_GAME: 'x' } as never, username: 'Host', gameCode: 'ABC123',
      currentGameMode: 'classic', gameModeConfirmed: true, hostSelectedGameMode: 'classic',
      t: ((k: string) => k) as never, socket: null, gameSessionId: 1 as never,
    }));
    expect(startCalls.at(-1)?.extras).toMatchObject({ playerCount: 1, botCount: 2 });
  });
});
