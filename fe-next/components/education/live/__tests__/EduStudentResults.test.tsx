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
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
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

describe('EduStudentResults', () => {
  beforeEach(() => {
    controller.current = makeController();
    useClassroomBossStore.getState().reset();
    window.sessionStorage.clear();
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

  it('given my round, when results show, then my best word, what I earned and the gap to the next place are on my card', () => {
    controller.current = makeController({ socketEvents: { xpGainedData: { xpEarned: 45 } }, sideEffects: { coinReward: { awarded: 12 } } });
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.getByTestId('edu-student-best-word')).toHaveTextContent('tame');
    expect(screen.getByTestId('edu-student-best-word')).toHaveTextContent('+4');
    expect(screen.getByTestId('edu-student-xp')).toHaveTextContent('mpUi.results.xp:{"xp":45}');
    expect(screen.getByTestId('edu-student-coins')).toHaveTextContent('mpUi.results.coins:{"coins":12}');
    expect(screen.getByTestId('edu-student-gap')).toHaveTextContent('mpUi.results.behind:{"points":10,"name":"Noa"}');
  });

  it('given a guest with no XP or coins, when results show, then no empty reward chips appear', () => {
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.queryByTestId('edu-student-xp')).toBeNull();
    expect(screen.queryByTestId('edu-student-coins')).toBeNull();
  });

  it('given my lesson-word tally, when results show, then it sits on my card', () => {
    const withMastery = { ...(props as object), classroomSummary: { teacherName: 'Ms Cohen', missedWords: [], lessonIds: [], masteryByPlayer: { Maya: { found: 3, total: 8 } } } };
    render(<EduStudentResults {...(withMastery as never)} />);
    expect(screen.getByTestId('edu-student-lesson')).toHaveTextContent('education.results.you.words:{"found":3,"total":8}');
  });

  it('given a boss round that ended, when my phone shows results, then the boss verdict is on it too', () => {
    useClassroomBossStore.getState().receiveState({ bossId: 'lexiconDragon', status: 'escaped', hp: 38, maxHp: 100, pctDealt: 62, topHitters: [], staggers: 0, lastHits: [] } as unknown as ClassroomBossView);
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.getByTestId('boss-outcome')).toHaveAttribute('data-outcome', 'escaped');
  });

  it('given I won, when results show, then my card says so', () => {
    render(<EduStudentResults {...({ ...(props as object), username: 'Noa' } as never)} />);
    expect(screen.getByTestId('edu-student-headline')).toHaveTextContent('education.results.you.won');
  });

  it('given an earlier round this session, when results show, then the same momentum chips as the /multiplayer card say how this round compares', () => {
    const summary = { teacherName: 'Ms Cohen', missedWords: [], lessonIds: ['l1'], lessonNames: ['Animals'], totalWords: 4, classFoundCount: 1, coverage: [], masteryByPlayer: { Maya: { found: 1, total: 4 } } };
    window.sessionStorage.setItem(sessionKeyFor(summary as never), JSON.stringify([{ score: 12, rank: 2, players: 2, sweep: false, at: 1 }]));
    render(<EduStudentResults {...({ ...(props as object), classroomSummary: summary } as never)} />);
    expect(screen.getByTestId('student-outcome-delta')).toHaveTextContent('education.results.moment.deltaUp:{"points":8}');
    expect(screen.getByTestId('student-outcome-round')).toHaveTextContent('"round":2');
  });

  it('given the first round of a session, when results show, then no momentum chips appear', () => {
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.queryByTestId('student-outcome-delta')).toBeNull();
  });
});
