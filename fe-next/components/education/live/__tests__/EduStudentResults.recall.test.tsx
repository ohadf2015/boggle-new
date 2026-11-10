import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const controller = vi.hoisted(() => ({ current: null as unknown }));
const missedProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
vi.mock('@/components/multiplayer/results/useMpResultsController', () => ({ useMpResultsController: () => controller.current }));
vi.mock('@/components/results/ResultsFriendStatus', () => ({ ResultsFriendStatusProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/education/economy/ChestRewardCta', () => ({ default: () => null }));
vi.mock('@/components/education/economy/RoundShop', () => ({ default: () => null }));
vi.mock('@/components/student/live/StudentMissedWords', () => ({
  StudentMissedWords: (p: Record<string, unknown>) => {
    missedProps.current = p;
    return <div data-testid="missed" />;
  },
}));
vi.mock('@/components/multiplayer/results/useOpenLessonPractice', () => ({ useOpenLessonPractice: () => vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({ ConfirmationDialog: () => null }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn(), register: vi.fn() } }));

import EduStudentResults from '@/components/education/live/EduStudentResults';
import { openMore } from './openStudentMore';
import { useStudyDeck } from '@/lib/education/studyDeckStore';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

const deck = [
  { word: 'Apple', definition: 'A red fruit' },
  { word: 'bread', definition: 'Baked from flour' },
  { word: 'cloud' },
  { word: 'dream', definition: 'Pictures while you sleep' },
];

const props = {
  finalScores: [{ username: 'Noa', score: 30 }, { username: 'Maya', score: 20 }],
  username: 'Maya',
  gameCode: 'AB12CD',
  gameSessionId: 77,
  classroomSummary: {
    teacherName: 'Ms Cohen',
    lessonIds: ['l1'],
    coverage: [
      { word: 'apple', foundBy: ['Noa'] },
      { word: 'cloud', foundBy: [] },
      { word: 'dream', foundBy: ['Maya'] },
    ],
  },
};

function makeController() {
  return {
    t,
    language: 'en',
    isExiting: false,
    showExitConfirm: false,
    setShowExitConfirm: vi.fn(),
    requestExit: vi.fn(),
    confirmExitRoom: vi.fn(),
    data: { sortedScores: props.finalScores, currentPlayerValidWords: [{ word: 'dream', score: 4 }] },
  };
}

describe('EduStudentResults missed-word recall', () => {
  beforeEach(() => {
    controller.current = makeController();
    sessionStorage.clear();
    act(() => useStudyDeck.getState().clear());
  });

  it('given a deck with meanings, when results show, then missed words carry their meaning', () => {
    act(() => useStudyDeck.getState().setDeck('AB12CD', deck));
    render(<EduStudentResults {...(props as never)} />);
    openMore();
    expect(missedProps.current?.words).toEqual(['apple', 'cloud']);
    expect(missedProps.current?.definitions).toEqual({ apple: 'A red fruit' });
  });

  it('given a reconnect cleared the live deck, when quick recall runs, then it quizzes the missed word against the deck', () => {
    act(() => {
      useStudyDeck.getState().setDeck('AB12CD', deck);
      useStudyDeck.getState().clear();
    });
    render(<EduStudentResults {...(props as never)} />);
    openMore();

    fireEvent.click(screen.getByTestId('missed-recall-start'));
    expect(screen.getByTestId('recall-definition')).toHaveTextContent('A red fruit');
    const options = within(screen.getByTestId('recall-options')).getAllByRole('button');
    expect(options.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(within(screen.getByTestId('recall-options')).getByRole('button', { name: 'Apple' }));

    expect(screen.getByTestId('missed-recall-done')).toBeInTheDocument();
    expect(useStudyDeck.getState().studied).toBe(false);
  });

  it('given no missed word has a meaning, when results show, then there is no quick recall', () => {
    act(() => useStudyDeck.getState().setDeck('AB12CD', deck.map((c) => ({ word: c.word }))));
    render(<EduStudentResults {...(props as never)} />);
    openMore();
    expect(screen.queryByTestId('missed-recall-start')).not.toBeInTheDocument();
    expect(missedProps.current?.definitions).toEqual({});
  });

  it('given the deck belongs to another room, when results show, then there is no quick recall', () => {
    act(() => useStudyDeck.getState().setDeck('ZZ99ZZ', deck));
    render(<EduStudentResults {...(props as never)} />);
    openMore();
    expect(screen.queryByTestId('missed-recall-start')).not.toBeInTheDocument();
  });
});
