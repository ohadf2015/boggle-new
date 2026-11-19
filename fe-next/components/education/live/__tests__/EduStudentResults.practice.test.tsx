import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const controller = vi.hoisted(() => ({ current: null as unknown }));
const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: push }), usePathname: () => '/en/education/live', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/components/multiplayer/results/useMpResultsController', () => ({ useMpResultsController: () => controller.current }));
vi.mock('@/components/results/ResultsFriendStatus', () => ({ ResultsFriendStatusProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/results/ResultsSocialSlot', () => ({ ResultsSocialSlot: () => <div data-testid="social-slot" /> }));
vi.mock('@/components/education/economy/useRoundReward', () => ({ useRoundReward: () => null }));
vi.mock('@/components/education/economy/RoundShop', () => ({ default: () => <div data-testid="round-shop" /> }));
vi.mock('@/components/education/results/ClassModeBridgeCard', () => ({ ClassModeBridgeCard: () => <div data-testid="class-mode-bridge" /> }));
vi.mock('@/components/education/live/useRival', () => ({ useRival: () => ({ rivalOutcome: null }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playTileSelectSound: vi.fn(), playStreakMilestoneSound: vi.fn() }) }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({ ConfirmationDialog: () => null }));

import EduStudentResults from '@/components/education/live/EduStudentResults';
import { useStudyDeck } from '@/lib/education/studyDeckStore';
import { openMore } from './openStudentMore';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

const scores = [{ username: 'Noa', score: 30 }, { username: 'Maya', score: 20 }];
const coverage = [{ word: 'apple', foundBy: ['Noa'] }, { word: 'dream', foundBy: ['Maya'] }];
const props = {
  finalScores: scores,
  username: 'Maya',
  gameCode: 'AB12CD',
  gameSessionId: 77,
  classroomSummary: {
    teacherName: 'Ms Cohen',
    classroomId: '11111111-1111-4111-8111-111111111111',
    lessonIds: ['l1'],
    coverage,
    masteryByPlayer: { Maya: { found: 1, total: 2 } },
  },
};
const withCoverage = (next: typeof coverage) => ({ ...props, classroomSummary: { ...props.classroomSummary, coverage: next } });
const DECK = [{ word: 'apple', definition: 'A red fruit' }, { word: 'dream', definition: 'Night story' }];

describe('EduStudentResults: how you did, words to practise, what happens next', () => {
  beforeEach(() => {
    push.mockClear();
    sessionStorage.clear();
    controller.current = {
      t,
      language: 'en',
      isExiting: false,
      showExitConfirm: false,
      setShowExitConfirm: vi.fn(),
      requestExit: vi.fn(),
      confirmExitRoom: vi.fn(),
      data: { sortedScores: scores, currentPlayerValidWords: [{ word: 'dream', score: 4 }] },
    };
    act(() => useStudyDeck.setState({ gameCode: null, cards: [], studied: false, kept: null }));
  });

  it('given missed words with meanings, when practice is tapped, then the quiz opens here and the student never leaves the room', () => {
    act(() => useStudyDeck.getState().setDeck('AB12CD', DECK));
    render(<EduStudentResults {...(props as never)} />);

    fireEvent.click(screen.getByTestId('practice-missed-button'));

    expect(push).not.toHaveBeenCalled();
    expect(within(screen.getByTestId('edu-student-practice')).getByTestId('recall-definition')).toHaveTextContent('A red fruit');
    expect(screen.getByTestId('edu-student-hero')).not.toBeVisible();
    expect(screen.queryByTestId('practice-missed-button')).toBeNull();
    expect(screen.getByTestId('wait-for-teacher-message')).toBeVisible();
  });

  it('given the student is practising, when they go back, then their results are still there', () => {
    act(() => useStudyDeck.getState().setDeck('AB12CD', DECK));
    render(<EduStudentResults {...(props as never)} />);
    fireEvent.click(screen.getByTestId('practice-missed-button'));
    fireEvent.click(screen.getByTestId('edu-student-practice-back'));
    expect(screen.queryByTestId('edu-student-practice')).toBeNull();
    expect(screen.getByTestId('edu-student-hero')).toBeVisible();
    expect(screen.getByTestId('practice-missed-button')).toBeInTheDocument();
  });

  it('given missed words with no meanings, when practice is tapped, then the student spells them', () => {
    render(<EduStudentResults {...(props as never)} />);
    fireEvent.click(screen.getByTestId('practice-missed-button'));
    expect(within(screen.getByTestId('edu-student-practice')).getByTestId('waiting-warmup')).toHaveAttribute('data-kind', 'spell');
  });

  it('given missed words that cannot be quizzed or spelled, then no practice button promises anything', () => {
    render(<EduStudentResults {...(withCoverage([{ word: '勉強', foundBy: [] }]) as never)} />);
    expect(screen.getByTestId('student-missed-words')).toHaveTextContent('勉強');
    expect(screen.queryByTestId('practice-missed-button')).toBeNull();
  });

  it('given a lesson round, then the words to practise show without opening anything', () => {
    render(<EduStudentResults {...(props as never)} />);
    const missed = screen.getByTestId('student-missed-words');
    expect(missed).toHaveTextContent('apple');
    expect(screen.getByTestId('edu-student-more')).not.toContainElement(missed);
  });

  it('given a round with no lesson words, then nobody is congratulated for finding all of them', () => {
    render(<EduStudentResults {...(withCoverage([]) as never)} />);
    openMore();
    expect(screen.queryByTestId('student-missed-words')).toBeNull();
  });

  it('given the extras, then shop, best word, class offers and social wait closed under More', () => {
    render(<EduStudentResults {...(props as never)} />);
    for (const id of ['round-shop', 'edu-student-best-word', 'edu-student-lesson', 'class-mode-bridge', 'social-slot']) expect(screen.queryByTestId(id)).toBeNull();
    openMore();
    const more = screen.getByTestId('edu-student-more');
    for (const id of ['round-shop', 'edu-student-best-word', 'edu-student-lesson', 'class-mode-bridge', 'social-slot']) expect(more).toContainElement(screen.getByTestId(id));
  });
});
