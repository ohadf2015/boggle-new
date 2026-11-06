import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ loading: false, isAuthenticated: false, user: null, profile: null }) }));
vi.mock('@/hooks/useWinStreak', () => ({ useWinStreak: () => ({ currentStreak: 0 }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playTileSelectSound: vi.fn(), playStreakMilestoneSound: vi.fn() }) }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));

import EduStudentLobby from '@/components/education/live/EduStudentLobby';
import { useStudyDeck } from '@/lib/education/studyDeckStore';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

const deck = [
  { word: 'xylem', definition: 'Carries water' },
  { word: 'phloem', definition: 'Carries sugar' },
  { word: 'stomata', definition: 'Leaf pores' },
  { word: 'sun' },
];
const wordFor = (definition: string) => deck.find((c) => c.definition === definition)!.word;

const base = {
  username: 'Maya',
  avatar: <span />,
  onEditAvatar: vi.fn(),
  nameSlot: <span>Maya</span>,
  readySlot: <button type="button" data-testid="ready-slot">ready</button>,
  classmates: [{ username: 'Maya' }],
  onExit: vi.fn(),
  t,
};

const option = (word: string) => within(screen.getByTestId('recall-options')).getByRole('button', { name: word });
const answerRight = () => fireEvent.click(option(wordFor(screen.getByTestId('recall-definition').textContent!)));
const answerWrong = () => {
  const answer = wordFor(screen.getByTestId('recall-definition').textContent!);
  const other = within(screen.getByTestId('recall-options')).getAllByRole('button').find((b) => b.textContent !== answer)!;
  fireEvent.click(other);
  return answer;
};

describe('EduStudentLobby learn then recall', () => {
  beforeEach(() => {
    sessionStorage.clear();
    act(() => useStudyDeck.getState().clear());
  });

  it('given a deck with definitions, when the lobby opens, then every word is listed with its meaning and READY waits for the quiz', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);

    const meet = screen.getByTestId('recall-meet');
    for (const card of deck) expect(within(meet).getByText(card.word)).toBeInTheDocument();
    expect(within(meet).getByText('Carries water')).toBeInTheDocument();
    expect(screen.getByTestId('study-ready-locked')).toHaveTextContent('eduStudent.recall.readyLocked');
    expect(screen.queryByTestId('ready-slot')).not.toBeInTheDocument();
  });

  it('given the quiz started, when every word is recalled twice, then READY unlocks and the deck is marked learned', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));

    expect(screen.getByTestId('recall-progress')).toHaveTextContent('"mastered":0,"total":3');
    for (let i = 0; i < 6; i++) {
      expect(screen.queryByTestId('ready-slot')).not.toBeInTheDocument();
      answerRight();
    }

    expect(screen.getByTestId('ready-slot')).toBeInTheDocument();
    expect(screen.getByTestId('study-learned')).toBeInTheDocument();
    expect(useStudyDeck.getState().studied).toBe(true);
  });

  it('given a right answer streak, when the second one lands, then the streak counter shows it', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));
    answerRight();
    expect(screen.getByTestId('recall-correct')).toBeInTheDocument();
    answerRight();
    expect(screen.getByTestId('recall-streak')).toHaveTextContent('"count":2');
  });

  it('given a wrong answer, when it is picked, then the right word and its meaning show until Next', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));
    const answer = answerWrong();

    const feedback = screen.getByTestId('recall-feedback-wrong');
    expect(within(feedback).getByText(answer)).toBeInTheDocument();
    expect(within(feedback).getByText(deck.find((c) => c.word === answer)!.definition!)).toBeInTheDocument();
    expect(screen.queryByTestId('recall-options')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recall-streak')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('recall-next'));
    expect(screen.getByTestId('recall-options')).toBeInTheDocument();
    expect(screen.getByTestId('study-ready-locked')).toBeInTheDocument();
  });

  it('given a student who already learned the deck, when they practice again, then READY stays unlocked', () => {
    act(() => {
      useStudyDeck.getState().setDeck('ROOM1', deck);
      useStudyDeck.getState().markStudied();
    });
    render(<EduStudentLobby {...base} />);
    expect(screen.getByTestId('study-learned')).toBeInTheDocument();
    expect(screen.getByTestId('ready-slot')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('recall-practice-again'));
    expect(screen.getByTestId('recall-options')).toBeInTheDocument();
    expect(screen.getByTestId('ready-slot')).toBeInTheDocument();
    answerWrong();
    expect(screen.getByTestId('ready-slot')).toBeInTheDocument();
  });

  it('given only one word with a meaning, when the lobby opens, then the flip-through cards stay as before', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', [{ word: 'xylem', definition: 'Carries water' }, { word: 'sun' }]));
    render(<EduStudentLobby {...base} />);
    expect(screen.getByTestId('study-word')).toHaveTextContent('xylem');
    expect(screen.queryByTestId('recall-meet')).not.toBeInTheDocument();
    expect(screen.getByTestId('study-ready-locked')).toHaveTextContent('eduStudent.lobby.studyReadyLocked');
  });
});
