import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/components/animations/LevelUpCelebration', () => ({
  LevelUpCelebration: () => <div data-testid="global-celebration" />,
}));

const controller = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('@/components/multiplayer/results/useMpResultsController', () => ({ useMpResultsController: () => controller.current }));
vi.mock('@/components/results/ResultsFriendStatus', () => ({ ResultsFriendStatusProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
const reward = vi.hoisted(() => ({ args: [] as unknown[] }));
vi.mock('@/components/education/economy/useRoundReward', () => ({
  useRoundReward: (gameCode: string | null, roundId: string | null) => {
    reward.args = [gameCode, roundId];
    return gameCode && roundId ? { gameCode, roundId, rarity: 'rare', xp: 35, itemId: 'hat', roundCash: 0, rank: 1, size: 2 } : null;
  },
}));
vi.mock('@/components/education/results/StudentChestBeat', () => ({
  StudentChestBeat: ({ reveal }: { reveal: { gameCode: string; roundId: string } }) => <div data-testid="chest-cta" data-code={reveal.gameCode} data-round={reveal.roundId} />,
}));
vi.mock('@/components/education/economy/RoundShop', () => ({ default: () => <div data-testid="round-shop" /> }));
vi.mock('@/components/student/live/StudentMissedWords', () => ({ StudentMissedWords: ({ words }: { words: string[] }) => <div data-testid="missed" data-words={words.join(',')} /> }));
vi.mock('@/components/multiplayer/results/useOpenLessonPractice', () => ({ useOpenLessonPractice: () => vi.fn() }));
vi.mock('next/image', () => ({ default: () => <span data-testid="img" /> }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('@/components/education/LevelUpCelebration', () => ({
  default: ({ levelUpData, onClose }: { levelUpData: { newLevel: number } | null; onClose: () => void }) =>
    levelUpData ? <button type="button" data-testid="level-up" data-level={levelUpData.newLevel} onClick={onClose} /> : null,
}));
vi.mock('@/components/education/lobby/WaitingWarmUp', () => ({ WaitingWarmUp: () => <div data-testid="waiting-warmup" /> }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) => (open ? <button type="button" data-testid="confirm-exit" onClick={onConfirm} /> : null),
}));

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

function makeController(over: Record<string, unknown> = {}) {
  return {
    t,
    language: 'en',
    isExiting: false,
    showExitConfirm: false,
    setShowExitConfirm: vi.fn(),
    requestExit: vi.fn(),
    confirmExitRoom: vi.fn(),
    data: {
      sortedScores: [{ username: 'Noa', score: 30 }, { username: 'Maya', score: 20 }],
      currentPlayerValidWords: [{ word: 'cat', score: 2 }, { word: 'tame', score: 4 }],
    },
    ...over,
  };
}

const props = {
  finalScores: [{ username: 'Noa', score: 30 }, { username: 'Maya', score: 20 }],
  username: 'Maya',
  gameCode: 'AB12CD',
  gameSessionId: 77,
  classroomSummary: { teacherName: 'Ms Cohen', missedWords: ['apple'], masteryByPlayer: { Maya: { missed: ['apple'] } }, lessonIds: ['l1'] },
} as never;

import EduStudentResults from '@/components/education/live/EduStudentResults';
import { LevelUpWatcher } from '@/components/progression/LevelUpWatcher';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { __resetLevelUpBusForTests, getPendingLevelUp } from '@/lib/levelUp/levelUpBus';
import { __resetRevealSessionForTests, getPublishedReveal, publishLevelUp } from '@/lib/avatar/revealTrigger';

const rung = 2;

describe('EduStudentResults level-up with the app-wide watcher mounted', () => {
  beforeEach(() => {
    controller.current = makeController({ socketEvents: { setShowLevelUpCelebration: vi.fn() } });
    useClassroomBossStore.getState().reset();
    window.sessionStorage.clear();
    __resetLevelUpBusForTests();
    __resetRevealSessionForTests();
  });

  it('given the round and its chest both levelled me up, when the chest has settled, then exactly one level-up beat plays, for the higher level', async () => {
    render(<><LevelUpWatcher /><EduStudentResults {...(props as object)} /></>);
    act(() => { publishLevelUp({ oldLevel: rung + 1, newLevel: rung + 2 }, 'multiplayer'); });
    act(() => { publishLevelUp({ oldLevel: rung + 2, newLevel: rung + 3 }, 'classroomChest'); });
    expect(screen.queryByTestId('level-up')).toBeNull();

    const beat = await screen.findByTestId('level-up', {}, { timeout: 4500 });
    expect(beat).toHaveAttribute('data-level', String(rung + 3));
    expect(screen.getAllByTestId('level-up')).toHaveLength(1);
    expect(screen.queryByTestId('global-celebration')).toBeNull();
    expect(getPendingLevelUp()).toBeNull();
  });

  it('given a level-up that unlocked a part, when the beat closes, then nothing waits to pop on the next page', async () => {
    const setShow = vi.fn();
    controller.current = makeController({ socketEvents: { setShowLevelUpCelebration: setShow } });
    render(<><LevelUpWatcher /><EduStudentResults {...(props as object)} /></>);
    act(() => { publishLevelUp({ oldLevel: rung - 1, newLevel: rung }, 'multiplayer'); });

    fireEvent.click(await screen.findByTestId('level-up', {}, { timeout: 4500 }));
    await waitFor(() => expect(screen.queryByTestId('level-up')).toBeNull());
    expect(setShow).toHaveBeenCalledWith(false);
    expect(getPublishedReveal()).toBeNull();
    expect(screen.queryByTestId('global-celebration')).toBeNull();
  });
});
