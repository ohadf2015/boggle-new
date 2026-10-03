import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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
vi.mock('@/host/components/tv-broadcast/TvLeaderboard', () => ({ __esModule: true, default: () => <div /> }));
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

describe('TvBroadcastView — the classroom host screen', () => {
  afterEach(() => {
    cleanup();
    gameModeRef.current = 'classic';
    fireConfetti.mockClear();
  });

  it('Given a classroom round, Then no floating help button sits over the join bar', () => {
    render(<TvBroadcastView {...props()} />);
    expect(screen.queryByTestId('tv-help-button')).toBeNull();
    expect(screen.getByTestId('tv-fullscreen-toggle')).toBeInTheDocument();
  });

  it('Given a classroom round, Then the live panel replaces the abstract activity grid', () => {
    render(<TvBroadcastView {...props()} />);
    expect(screen.getByTestId('classroom-live-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('tv-activity-panel')).toBeNull();
  });

  it('Given a Wordcraft round, Then the host sees the Wordcraft race, not a board placeholder', () => {
    gameModeRef.current = 'wordcraft';
    render(<TvBroadcastView {...props()} />);
    expect(screen.getByTestId('tv-wordcraft-broadcast')).toBeInTheDocument();
    expect(screen.getByTestId('wordcraft-projector')).toBeInTheDocument();
    expect(screen.queryByTestId('tv-activity-panel')).toBeNull();
    expect(screen.queryByText('common.stop')).toBeNull();
  });

  it('Given time runs out and nobody scored, Then no confetti fires', () => {
    render(<TvBroadcastView {...props()} />);
    timesUp.current?.();
    expect(fireConfetti).not.toHaveBeenCalled();
  });

  it('Given time runs out after a real score, Then the buzzer still celebrates', () => {
    render(<TvBroadcastView {...props({ playerScores: { Zoe: 130, 'Ms Free': 0 }, playerWordCounts: { Zoe: 1 } })} />);
    timesUp.current?.();
    expect(fireConfetti).toHaveBeenCalledTimes(1);
  });

  it('Given a mode backdrop, Then it paints under the board instead of dimming it', () => {
    const { container } = render(<TvBroadcastView {...props()} />);
    const backdrop = container.querySelector('[data-testid="tv-mode-backdrop"]') as HTMLElement;
    expect(backdrop.className).toContain('-z-10');
    expect((backdrop.parentElement as HTMLElement).className).toContain('isolate');
  });

  it('Given a classroom round on a phone, Then everything under the join bar scrolls above the docked control strip', () => {
    render(<TvBroadcastView {...props()} />);
    const body = screen.getByTestId('tv-classroom-body');
    expect(body.className).toMatch(/(^| )flex-1( |$)/);
    expect(body.className).toMatch(/(^| )min-h-0( |$)/);
    expect(body.className).toMatch(/(^| )overflow-y-auto( |$)/);
    expect(body).toContainElement(screen.getByTestId('classroom-live-panel'));
    expect(body).toContainElement(screen.getByTestId('tv-leaderboard-card'));
    expect(body).not.toContainElement(screen.getByTestId('tv-join-row'));
  });

  it('Given a classroom round on a phone, Then the leaderboard grows with the class instead of clipping inside a fixed box', () => {
    render(<TvBroadcastView {...props()} />);
    const card = screen.getByTestId('tv-leaderboard-card').className;
    expect(card).toContain('md:overflow-auto');
    expect(card).not.toMatch(/(^| )overflow-auto( |$)/);
  });

  it('Given a classroom round, Then the timer header and ticker shrink to phone size', () => {
    render(<TvBroadcastView {...props()} />);
    expect(headerProps.current?.compact).toBe(true);
    expect(screen.getByTestId('tv-momentum-slot').className).toMatch(/(^| )hidden( |$)/);
    expect(screen.getByTestId('tv-momentum-slot').className).toContain('md:block');
  });

  it('Given a classroom round on a short projector, Then the commentary ticker gives its row to the leaderboard', () => {
    render(<TvBroadcastView {...props()} />);
    expect(screen.getByTestId('tv-momentum-slot').className).toContain('md:medium-short:hidden');
  });

  it('Given a room whose classroom context has not arrived (host reload), Then the board still scrolls above the strip', () => {
    render(<TvBroadcastView {...props({ classroomLive: null })} />);
    expect(screen.getByTestId('tv-classroom-body')).toContainElement(screen.getByTestId('tv-leaderboard-card'));
    expect(headerProps.current?.compact).toBeFalsy();
  });

  it('Given an arcade room, Then the help button is still offered', () => {
    render(<TvBroadcastView {...props({ classroomLive: null })} />);
    expect(screen.getByTestId('tv-help-button')).toBeInTheDocument();
  });
  it('Given a classroom round on a tall projector, Then the commentary ticker gives its row to a bigger leaderboard', () => {
    render(<TvBroadcastView {...props()} />);
    expect(screen.getByTestId('tv-momentum-slot').className).toContain('lg:[@media(min-height:851px)]:hidden');
  });

  it('Given a classroom round with the site header gone, Then the host still has a confirmed exit inside the join bar', () => {
    const onExitRoom = vi.fn();
    render(<TvBroadcastView {...props({ onExitRoom })} />);
    const exit = screen.getByTestId('tv-classroom-exit');
    expect(screen.getByTestId('tv-join-row')).toContainElement(exit);
    expect(exit).toHaveAttribute('aria-label', 'eduLive.live.exitLabel');
    fireEvent.click(exit);
    expect(onExitRoom).toHaveBeenCalledTimes(1);
  });

  it('Given an arcade room, Then no classroom exit is added to the join bar', () => {
    render(<TvBroadcastView {...props({ classroomLive: null, onExitRoom: vi.fn() })} />);
    expect(screen.queryByTestId('tv-classroom-exit')).toBeNull();
  });
  it('Given a classroom round, Then toasts render in the header slot beside the timer, never floating over the leaderboard', () => {
    render(<TvBroadcastView {...props()} />);
    const slot = headerProps.current?.toastSlot as React.ReactElement<{ placement?: string }> | undefined;
    expect(slot?.props.placement).toBe('inline');
    expect(screen.queryByTestId('tv-toast-queue')).toBeNull();
  });

  it('Given an arcade room, Then toasts keep their floating overlay', () => {
    render(<TvBroadcastView {...props({ classroomLive: null })} />);
    expect(headerProps.current?.toastSlot).toBeUndefined();
    expect(screen.getByTestId('tv-toast-queue')).toHaveAttribute('data-placement', 'overlay');
  });
});
