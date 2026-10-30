import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const emitMock = vi.fn();
vi.mock('@/utils/SocketContext', () => ({ useSocket: () => ({ socket: { emit: emitMock, on: vi.fn(), off: vi.fn() } }) }));
vi.mock('@/utils/posthogEngagement', () => ({ trackSoloPlayPrompt: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false, canSeeInWorkModes: false }) }));
vi.mock('@/hooks/useLobbyAdGate', () => ({ useLobbyAdGate: () => ({ anyAdActive: false }) }));
vi.mock('@/hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({ showInviteButton: vi.fn(), hideInviteButton: vi.fn(), isInviteButtonVisible: false }),
}));
vi.mock('@/hooks/gameState', () => ({
  useHostSelectedGameMode: () => 'random',
  useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }),
}));
vi.mock('@/host/components/tv-broadcast/TvTutorialOverlay', () => ({ isTvTutorialComplete: () => true }));

import { useHostLobby, type HostLobbyPlayer } from '../useHostLobby';
import { PUBLIC_ROOM_BOT_START_GRACE_SECONDS } from '@/lib/multiplayer/soloHostPrompt';

const host: HostLobbyPlayer = { username: 'Host', isHost: true };
const bot: HostLobbyPlayer = { username: 'Bot Ava', isBot: true };

function setup(onAutoStartWithBots = vi.fn()) {
  const args = {
    gameCode: 'ROOM1',
    username: 'Host',
    hostPlaying: true,
    playersReady: [host] as (string | HostLobbyPlayer)[],
    timerValue: 3,
    setTimerValue: vi.fn(),
    setDifficulty: vi.fn(),
    setMinWordLength: vi.fn(),
    tournamentCreating: false,
    isPrivate: false,
    isQuickPlay: false,
    onStartGame: vi.fn(),
    onAutoStartWithBots,
  };
  const hook = renderHook((props: typeof args) => useHostLobby(props), { initialProps: args });
  return { ...hook, args, onAutoStartWithBots };
}

describe('useHostLobby with bots in the roster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('does not count bots as human guests', () => {
    const { result, rerender, args } = setup();
    rerender({ ...args, playersReady: [host, bot] });
    expect(result.current.humanGuestCount).toBe(0);
  });

  it('given a public room auto-filled with bots, when the grace window ends, then it still auto-starts', () => {
    const { rerender, args, onAutoStartWithBots } = setup();
    act(() => { vi.advanceTimersByTime(15_000); });
    for (let i = 0; i < 20; i += 1) act(() => { vi.advanceTimersByTime(1000); });
    expect(emitMock).toHaveBeenCalledWith('setAutoFill', { enabled: true, targetCount: 3 });

    rerender({ ...args, playersReady: [host, bot] });
    act(() => { vi.advanceTimersByTime(PUBLIC_ROOM_BOT_START_GRACE_SECONDS * 1000); });

    expect(onAutoStartWithBots).toHaveBeenCalledTimes(1);
  });

  it('in TV mode the host is the screen, not a seat', () => {
    const { result, rerender, args } = setup();
    rerender({ ...args, hostPlaying: false, playersReady: [host, { username: 'Ada' }, bot] });
    expect(result.current.seatedPlayers.map((p) => (typeof p === 'string' ? p : p.username))).toEqual(['Ada', 'Bot Ava']);
  });
});
