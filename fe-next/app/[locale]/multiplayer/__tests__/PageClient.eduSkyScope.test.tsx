import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

const state = vi.hoisted(() => ({ classroomContext: 'arcade' as 'arcade' | 'classroom' | 'pending', classroomEnded: null as string | null }));

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('../useMpPageState', () => ({
  useMpPageState: () => ({
    t: (k: string) => k, language: 'en', router: {}, isClassroomHost: false, username: 'kid', hostUsername: 'teacher',
    gameCode: 'ABC123', prefilledRoomCode: '', isActive: true, isHost: false, showResults: false, gameActive: true,
    liveGameMode: 'classic', playersInRoom: [], lessonDataState: null, liveClassroomGame: null,
    socket: null, isConnected: true, isSpectator: false, spectators: [], handleUpgradeToPlayer: vi.fn(),
    signalIntentionalLeave: vi.fn(), isPaused: false, pauseGame: vi.fn(), resumeGame: vi.fn(), extendTime: vi.fn(),
    endRoundNow: vi.fn(), skipTargetWord: vi.fn(), classroomAccessibility: null, classroomLevel: null,
    classroomWordBank: [], teacherStrip: { visible: false, quizPaused: false, quizRound: false }, quizOwnsScreen: false,
    socketContextValue: null, hostLeftState: null, setHostLeftState: vi.fn(), classroomContext: state.classroomContext,
    classroomDecisionRef: { current: { context: state.classroomContext, isHost: false } }, exitClassroomStudentToHub: vi.fn(),
    classroomEnded: state.classroomEnded, retryClassroomRoom: vi.fn(), handleExitToLobby: vi.fn(), exitMp: vi.fn(), routerProps: {},
  }),
}));
vi.mock('../MpPhaseRouter', () => ({ MpPhaseRouter: () => <div data-testid="phase" /> }));
vi.mock('@/components/AutoHideHeader', () => ({ default: () => null }));
vi.mock('@/components/ConnectionStatusIndicator', () => ({ ConnectionDot: () => null, ConnectionBanner: () => null }));
vi.mock('@/components/multiplayer/ConnectionQualityChip', () => ({ ConnectionQualityChip: () => null }));
vi.mock('@/components/SpectatorBanner', () => ({ default: () => null }));
vi.mock('@/components/education/live/useLegacyClassroomRedirect', () => ({ useLegacyClassroomRedirect: () => null }));

import MultiplayerPageClient from '../PageClient';

function renderIn(context: typeof state.classroomContext, ended: string | null = null) {
  state.classroomContext = context;
  state.classroomEnded = ended;
  return render(<MultiplayerPageClient />);
}

describe('/multiplayer sky scope', () => {
  it('Given a classroom room (URL flag, typed class code, or a reconnect that re-reads the record), Then the page is sky', () => {
    const { container } = renderIn('classroom');
    expect(container.querySelector('[data-edu-theme="sky"]')).not.toBeNull();
  });

  it.each(['arcade', 'pending'] as const)('Given a %s room, Then the page stays dark', (context) => {
    const { container } = renderIn(context);
    expect(container.querySelector('[data-edu-theme]')).toBeNull();
  });

  it('Given a typed-code student whose class ended (the cleared code reads as arcade), Then the ended card stays on sky', () => {
    const { container } = renderIn('arcade', 'ABC123');
    expect(container.querySelector('[data-edu-theme="sky"]')).not.toBeNull();
  });

  it('Given the record resolves while playing, Then the round is not remounted', () => {
    state.classroomContext = 'pending';
    state.classroomEnded = null;
    const { getByTestId, rerender } = render(<MultiplayerPageClient />);
    const phase = getByTestId('phase');
    state.classroomContext = 'classroom';
    rerender(<MultiplayerPageClient />);
    expect(getByTestId('phase')).toBe(phase);
  });
});
