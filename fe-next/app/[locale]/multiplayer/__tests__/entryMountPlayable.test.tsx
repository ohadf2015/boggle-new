import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

/**
 * qa-smoke / obscura flag /en/multiplayer as an "empty shell" because older
 * tests mocked next/dynamic to `() => null` — a crash in the entry phase
 * still "passed". This file actually mounts a playable stub and also locks
 * EntryScreen to ssr:true so first paint cannot regress to a blank lobby.
 */

const { dynamicCalls } = vi.hoisted(() => ({
  dynamicCalls: [] as Array<{ ssr?: boolean; hasLoading: boolean }>,
}));

vi.mock('next/dynamic', () => ({
  default: (_loader: unknown, opts?: { ssr?: boolean; loading?: unknown }) => {
    dynamicCalls.push({
      ssr: opts?.ssr,
      hasLoading: typeof opts?.loading === 'function',
    });
    return function PlayableStub() {
      return <div data-testid="mp-playable-surface">lobby</div>;
    };
  },
}));

vi.mock('@/components/ErrorBoundaries', () => ({
  FeatureErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => null }));
vi.mock('@/components/ui/PlayfulBackground', () => ({ PlayfulBackground: () => null }));

import { MpPhaseRouter, type MpPhaseRouterProps } from '../MpPhaseRouter';

const entryIsSsr = dynamicCalls.some((c) => c.ssr === true);

function props(overrides: Partial<MpPhaseRouterProps> = {}): MpPhaseRouterProps {
  const noop = () => {};
  return {
    phase: 'entry',
    gameCode: '',
    username: 'Sam',
    isHost: false,
    socket: null,
    roomLanguage: 'en',
    isClassroomMode: false,
    classroomGameMode: null,
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

describe('multiplayer entry mounts a playable surface (not next/dynamic null)', () => {
  it('EntryScreen is SSR’d so the lobby is in the first HTML', () => {
    expect(entryIsSsr, 'EntryScreen next/dynamic ssr:true').toBe(true);
  });

  it('entry phase renders a playable surface instead of an empty shell', () => {
    const { getByTestId, queryByTestId } = render(<MpPhaseRouter {...props({ phase: 'entry' })} />);
    expect(queryByTestId('mp-playable-surface')).toBeTruthy();
    expect(getByTestId('mp-playable-surface').textContent).toMatch(/lobby/i);
  });
});
