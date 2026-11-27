import React from 'react';
import { act, render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvBroadcastView from '@/host/components/TvBroadcastView';
import type { Language } from '@/shared/types/game';

const { gameModeRef, timesUp, fireConfetti, headerProps } = vi.hoisted(() => ({
  gameModeRef: { current: 'classic' as string },
  headerProps: { current: null as null | Record<string, unknown> },
  timesUp: { current: null as null | (() => void) },
  fireConfetti: vi.fn(),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn(), playTimesUpSound: vi.fn() }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/host/hooks/useTvPlayerCombos', () => ({ useTvPlayerCombos: () => ({ playerCombos: {} }) }));
vi.mock('@/host/hooks/useTvNotifications', () => ({
  useTvNotifications: () => ({ notifications: [], dismissNotification: vi.fn() }),
}));
vi.mock('@/host/hooks/useTvSounds', () => ({ useTvSounds: () => ({ playSound: vi.fn() }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));
vi.mock('@/host/hooks/useTvFullscreen', () => ({
  useTvFullscreen: () => ({ isFullscreen: false, toggleFullscreen: vi.fn(), isSupported: true }),
}));
vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => gameModeRef.current,
  useWordHuntPlayerLives: () => ({}),
  useWordHuntEliminatedPlayers: () => [],
  useWordHuntTargetLength: () => 0,
}));
vi.mock('@/components/education/vocabQuiz/useIsVocabQuizRoom', () => ({ useIsVocabQuizRoom: () => false }));
vi.mock('@/host/components/tv-broadcast/TvLeaderboard', async () => {
  const { useClassroomBoard } = await import('@/components/education/live/classroomBoard');
  const LeaderboardProbe = () => <div data-testid="tv-leaderboard-probe" data-classroom={String(useClassroomBoard())} />;
  return { __esModule: true, default: LeaderboardProbe };
});
vi.mock('@/host/components/tv-broadcast/TvNotificationQueue', () => ({
  __esModule: true,
  default: ({ placement }: { placement?: string }) => <div data-testid="tv-toast-queue" data-placement={placement ?? 'overlay'} />,
}));
vi.mock('@/host/components/tv-broadcast/TvGameHeader', () => ({
  __esModule: true,
  default: (p: Record<string, unknown>) => {
    headerProps.current = p;
    return <div />;
  },
}));
vi.mock('@/host/components/tv-broadcast/TvTutorialOverlay', () => ({
  __esModule: true,
  default: () => null,
  isTvTutorialComplete: () => true,
  TvHelpButton: () => <button data-testid="tv-help-button">Help</button>,
}));
vi.mock('@/host/components/tv-broadcast/TvTimesUpOverlay', () => ({
  __esModule: true,
  default: ({ onTimesUp }: { onTimesUp?: () => void }) => {
    timesUp.current = onTimesUp ?? null;
    return null;
  },
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: () => fireConfetti() }));

const classroomLive = { round: 1, lessonName: 'Common English', playStyle: 'ffa' as const };

const props = (over: Partial<React.ComponentProps<typeof TvBroadcastView>> = {}) => ({
  gameCode: 'SXHDGP',
  username: 'Ms Free',
  roomLanguage: 'en' as Language,
  tableData: [],
  remainingTime: 60,
  timerValue: 3,
  playersReady: ['Zoe', { username: 'Ms Free', isHost: true }],
  playerScores: { Zoe: 0, 'Ms Free': 0 },
  playerWordCounts: { Zoe: 0, 'Ms Free': 0 },
  socket: null,
  t: (key: string) => key,
  classroomLive,
  lessonWords: ['house', 'water'],
  ...over,
});

afterEach(() => { cleanup(); gameModeRef.current = 'classic'; });

describe('TvBroadcastView classroom wall skin', () => {
  it('given a classroom round, then the wall stands on the sky page with a cream leaderboard card and no navy mode art', () => {
    const { container } = render(<TvBroadcastView {...props()} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-edu-page');
    expect(root.className).not.toContain('bg-neo-navy');
    expect(screen.queryByTestId('tv-mode-backdrop')).toBeNull();
    expect(screen.getByTestId('tv-leaderboard-card')).toHaveClass('bg-edu-surface', 'border-neo-black', 'shadow-edu-lip');
    expect(headerProps.current?.classroom).toBe(true);
    expect(screen.getByTestId('tv-fullscreen-toggle').className).not.toContain('text-neo-cream');
    expect(screen.getByTestId('tv-leaderboard-probe').dataset.classroom).toBe('true');
  });

  it('given an arcade room, then the navy wall, its mode art and the navy leaderboard card stay as before', () => {
    const { container } = render(<TvBroadcastView {...props({ classroomLive: null })} />);
    expect((container.firstElementChild as HTMLElement).className).toContain('bg-neo-navy');
    expect(screen.getByTestId('tv-mode-backdrop')).toBeInTheDocument();
    expect(screen.getByTestId('tv-leaderboard-card').className).toContain('bg-neo-navy-light text-neo-cream');
    expect(headerProps.current?.classroom).toBeFalsy();
    expect(screen.getByTestId('tv-fullscreen-toggle').className).toContain('bg-neo-black/80');
    expect(screen.getByTestId('tv-leaderboard-probe').dataset.classroom).toBe('false');
  });
});
