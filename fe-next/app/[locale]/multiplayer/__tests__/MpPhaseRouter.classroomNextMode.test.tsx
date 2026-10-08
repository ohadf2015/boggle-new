import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

const { seen } = vi.hoisted(() => ({ seen: [] as Array<{ name: string; props: Record<string, unknown> }> }));

// next/dynamic is called once per view in module order: HostView, PlayerView, EntryScreen, MpResultsScreen.
vi.mock('next/dynamic', () => {
  const names = ['HostView', 'PlayerView', 'EntryScreen', 'MpResultsScreen'];
  let i = 0;
  return {
    default: () => {
      const name = names[i++];
      return function Stub(props: Record<string, unknown>) {
        seen.push({ name, props });
        return null;
      };
    },
  };
});
vi.mock('@/components/ErrorBoundaries', () => ({
  FeatureErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => null }));
vi.mock('@/components/ui/PlayfulBackground', () => ({ PlayfulBackground: () => null }));

import { MpPhaseRouter, type MpPhaseRouterProps } from '../MpPhaseRouter';

function props(overrides: Partial<MpPhaseRouterProps>): MpPhaseRouterProps {
  const noop = () => {};
  return {
    phase: 'results',
    gameCode: 'ABC123',
    username: 'Sam',
    isHost: true,
    socket: null,
    roomLanguage: 'en',
    isClassroomMode: false,
    classroomGameMode: 'wordhunt',
    onExitToLobby: noop,
    onUsernameChange: noop,
    resultsData: null,
    handleReturnToRoom: noop,
    gameDuration: 60,
    seriesTracker: {
      standings: [], roundNumber: 1, totalGames: 1, seriesLeader: null, reset: noop,
    } as unknown as MpPhaseRouterProps['seriesTracker'],
    entry: {} as MpPhaseRouterProps['entry'],
    playersInRoom: [],
    handleShowResults: noop,
    pendingGameStart: null,
    handleGameStartConsumed: noop,
    lessonData: null,
    isPrivate: false,
    quickPlay: false,
    classroomLive: null,
    ...overrides,
  } as MpPhaseRouterProps;
}

describe('MpPhaseRouter classroom next mode follows the context it is given', () => {
  beforeEach(() => {
    seen.length = 0;
  });

  it('a classroom room offers its next game mode on the results screen', () => {
    render(<MpPhaseRouter {...props({ isClassroomMode: true })} />);
    const results = seen.find((s) => s.name === 'MpResultsScreen');
    expect(results?.props.classroomNextMode).toBe('wordhunt');
  });

  it('an arcade room gets no classroom next mode even when a mode value is passed', () => {
    render(<MpPhaseRouter {...props({ isClassroomMode: false, classroomGameMode: 'wordhunt' })} />);
    const results = seen.find((s) => s.name === 'MpResultsScreen');
    expect(results?.props.classroomNextMode).toBeNull();
  });
});
