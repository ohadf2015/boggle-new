import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const controller = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('@/components/multiplayer/results/useMpResultsController', () => ({ useMpResultsController: () => controller.current }));
vi.mock('@/components/results/ResultsFriendStatus', () => ({ ResultsFriendStatusProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/education/economy/ChestRewardCta', () => ({
  default: ({ gameCode, roundId }: { gameCode: string; roundId: string | null }) => <div data-testid="chest-cta" data-code={gameCode} data-round={roundId ?? ''} />,
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

import EduStudentResults from '@/components/education/live/EduStudentResults';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';
import { sessionKeyFor } from '@/lib/education/roundEndHistory';

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

function duelSocket(rival: { rivalName: string; myScore: number; rivalScore: number } | null) {
  const handlers: Record<string, Array<(d: unknown) => void>> = {};
  return {
    on: (e: string, fn: (d: unknown) => void) => { (handlers[e] ??= []).push(fn); },
    off: (e: string, fn: (d: unknown) => void) => { handlers[e] = (handlers[e] ?? []).filter((h) => h !== fn); },
    emit: (e: string) => {
      if (e !== 'rivalSync') return;
      const reply = { gameSessionId: 77, rival: rival && { ...rival, rivalAvatar: null } };
      queueMicrotask(() => act(() => { (handlers.rivalUpdate ?? []).forEach((h) => h(reply)); }));
    },
  };
}

const flush = () => act(async () => { await Promise.resolve(); });

describe('EduStudentResults rival line', () => {
  beforeEach(() => {
    controller.current = makeController();
    useClassroomBossStore.getState().reset();
    window.sessionStorage.clear();
  });

  it('Given I won my duel, When results show, Then the hero names my rival and the margin instead of the next-place gap', async () => {
    render(<EduStudentResults {...(props as object)} socket={duelSocket({ rivalName: 'Dana', myScore: 20, rivalScore: 16 }) as never} />);
    await flush();
    expect(screen.getByTestId('edu-student-rival')).toHaveTextContent('education.rivals.outcome.won:{"name":"Dana","points":4}');
    expect(screen.queryByTestId('edu-student-gap')).not.toBeInTheDocument();
  });

  it('Given my rival won, When results show, Then the line is the kind rematch line with the margin', async () => {
    render(<EduStudentResults {...(props as object)} socket={duelSocket({ rivalName: 'Dana', myScore: 12, rivalScore: 20 }) as never} />);
    await flush();
    expect(screen.getByTestId('edu-student-rival')).toHaveTextContent('education.rivals.outcome.lost:{"name":"Dana","points":8}');
  });

  it('Given we tied, When results show, Then the tied line shows', async () => {
    render(<EduStudentResults {...(props as object)} socket={duelSocket({ rivalName: 'Dana', myScore: 20, rivalScore: 20 }) as never} />);
    await flush();
    expect(screen.getByTestId('edu-student-rival')).toHaveTextContent('education.rivals.outcome.tied:{"name":"Dana"}');
  });

  it('Given rivalry was off (no rival), When results show, Then today\'s behind-by line is unchanged', async () => {
    render(<EduStudentResults {...(props as object)} socket={duelSocket(null) as never} />);
    await flush();
    expect(screen.queryByTestId('edu-student-rival')).not.toBeInTheDocument();
    expect(screen.getByTestId('edu-student-gap')).toHaveTextContent('mpUi.results.behind:{"points":10,"name":"Noa"}');
  });
});
