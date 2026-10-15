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
vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) => (open ? <button type="button" data-testid="confirm-exit" onClick={onConfirm} /> : null),
}));

import EduStudentResults from '@/components/education/live/EduStudentResults';

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

describe('EduStudentResults', () => {
  beforeEach(() => {
    controller.current = makeController();
  });

  it('given my round, when results show, then my placing and score lead the screen', () => {
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.getByTestId('edu-student-rank')).toHaveTextContent('eduLiveRoom.studentResults.rankOf:{"rank":2,"total":2}');
    expect(screen.getByTestId('edu-student-score')).toHaveTextContent('20');
  });

  it('given my valid words, when results show, then each is listed', () => {
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.getAllByTestId('edu-student-word').map((el) => el.textContent)).toEqual(['tame', 'cat']);
  });

  it('given a classroom round, when results show, then the server chest gets the code and round id, plus shop', () => {
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.getByTestId('chest-cta')).toHaveAttribute('data-code', 'AB12CD');
    expect(screen.getByTestId('chest-cta')).toHaveAttribute('data-round', '77');
    expect(screen.getByTestId('round-shop')).toBeInTheDocument();
  });

  it('given a student, when results show, then no teacher upsell or report appears', () => {
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.queryByText(/pro|upgrade|report/i)).toBeNull();
  });

  it('given scores not in yet, when results mount, then a skeleton shows instead of a blank screen', () => {
    controller.current = makeController({ data: { sortedScores: [], currentPlayerValidWords: [] } });
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.getByTestId('edu-student-results-skeleton')).toBeInTheDocument();
  });

  it('given the student leaves, when confirmed, then the shared exit runs', () => {
    const c = makeController({ showExitConfirm: true });
    controller.current = c;
    render(<EduStudentResults {...(props as object)} />);
    fireEvent.click(screen.getByTestId('edu-student-results-leave'));
    fireEvent.click(screen.getByTestId('confirm-exit'));
    expect(c.requestExit).toHaveBeenCalled();
    expect(c.confirmExitRoom).toHaveBeenCalled();
  });
});
