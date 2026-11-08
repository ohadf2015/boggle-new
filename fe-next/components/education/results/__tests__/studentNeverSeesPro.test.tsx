import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
const auth = vi.hoisted(() => ({ user: { id: 's1' } as { id: string } | null, loading: false, isTeacher: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
const useTeacherPro = vi.hoisted(() => vi.fn(() => ({ hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false })));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => useTeacherPro() }));
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

describe('A student or guest never sees a Teacher Pro prompt on the round results', () => {
  beforeEach(() => {
    controller.current = makeController();
    useClassroomBossStore.getState().reset();
    window.sessionStorage.clear();
    useTeacherPro.mockClear();
  });

  it.each([
    ['a signed-in student', { user: { id: 's1' }, loading: false, isTeacher: false }],
    ['an anonymous guest', { user: null, loading: false, isTeacher: false }],
  ])('Given %s, When results show, Then there is no Pro pill, price, upgrade link or Pro status call', (_label, viewer) => {
    Object.assign(auth, viewer);
    const { container } = render(<EduStudentResults {...(props as object)} />);
    expect(screen.getByTestId('edu-student-score')).toHaveTextContent('20');
    expect(container.querySelector('[data-testid="pro-pill"]')).toBeNull();
    expect(container.querySelector('a[href*="/teacher/upgrade"], a[href*="for-schools"]')).toBeNull();
    expect(container.textContent ?? '').not.toMatch(/\$9|Teacher Pro|eduProResults|proPill|class-report/i);
    expect(screen.queryByTestId('class-report-teaser')).toBeNull();
    expect(useTeacherPro).not.toHaveBeenCalled();
  });
});
