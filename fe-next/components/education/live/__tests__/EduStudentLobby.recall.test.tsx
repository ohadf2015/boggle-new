import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ loading: false, isAuthenticated: false, user: null, profile: null }) }));
vi.mock('@/hooks/useWinStreak', () => ({ useWinStreak: () => ({ currentStreak: 0 }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playTileSelectSound: vi.fn(), playStreakMilestoneSound: vi.fn() }) }));
const confetti = vi.hoisted(() => vi.fn());
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: confetti }));
const studyCompleted = vi.hoisted(() => vi.fn());
vi.mock('@/lib/education/studyTelemetry', () => ({ trackEduStudyCompleted: studyCompleted }));
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
const tile = (letter: string) =>
  within(screen.getByTestId('recall-spell-tiles')).getAllByRole('button').find((b) => b.dataset.letter === letter && b.dataset.used === 'false')!;
const wrongTile = (next: string) =>
  within(screen.getByTestId('recall-spell-tiles')).getAllByRole('button').find((b) => b.dataset.letter !== next && b.dataset.used === 'false')!;
const spelling = () => screen.queryByTestId('recall-spell');
const answerRight = () => {
  const answer = wordFor(screen.getByTestId('recall-definition').textContent!);
  if (!spelling()) return fireEvent.click(option(answer));
  for (const letter of answer.toUpperCase()) fireEvent.click(tile(letter));
};
const answerWrong = () => {
  const answer = wordFor(screen.getByTestId('recall-definition').textContent!);
  if (spelling()) {
    fireEvent.click(wrongTile(answer[0].toUpperCase()));
    fireEvent.click(wrongTile(answer[0].toUpperCase()));
    return answer;
  }
  const other = within(screen.getByTestId('recall-options')).getAllByRole('button').find((b) => b.textContent !== answer)!;
  fireEvent.click(other);
  return answer;
};

describe('EduStudentLobby learn then recall', () => {
  beforeEach(() => {
    sessionStorage.clear();
    studyCompleted.mockClear();
    confetti.mockClear();
    act(() => useStudyDeck.getState().clear());
  });

  it('given a deck with definitions, when the lobby opens, then every word shows as a chip, its meaning opens on tap, and READY waits for the quiz', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);

    const meet = screen.getByTestId('recall-meet');
    for (const card of deck) expect(within(meet).getByText(card.word)).toBeInTheDocument();
    expect(within(meet).queryByText('Carries water')).toBeNull();
    const chip = within(meet).getByRole('button', { name: new RegExp(deck.find((c) => c.definition === 'Carries water')!.word) });
    expect(chip).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-expanded', 'true');
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
    expect(studyCompleted).toHaveBeenCalledTimes(1);
    expect(studyCompleted).toHaveBeenCalledWith(expect.objectContaining({ words: 3 }));
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

  it('given a word picked right once, when it comes back, then the student builds it from scrambled letters', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));
    for (let i = 0; i < 3; i++) answerRight();

    expect(spelling()).toBeInTheDocument();
    expect(screen.queryByTestId('recall-options')).not.toBeInTheDocument();
    expect(screen.getByTestId('recall-progress')).toHaveTextContent('"mastered":0');
    answerRight();
    expect(screen.getByTestId('recall-progress')).toHaveTextContent('"mastered":1');
  });

  it('given a spelling, when one tile is wrong, then the word still counts', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck.slice(0, 2)));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));
    for (let i = 0; i < 2; i++) answerRight();
    const answer = wordFor(screen.getByTestId('recall-definition').textContent!);
    fireEvent.click(wrongTile(answer[0].toUpperCase()));
    for (const letter of answer.toUpperCase()) fireEvent.click(tile(letter));
    expect(screen.queryByTestId('recall-feedback-wrong')).not.toBeInTheDocument();
    expect(screen.getByTestId('recall-progress')).toHaveTextContent('"mastered":1');
  });

  it('given a spelling, when two tiles are wrong, then the word and its meaning show and it comes back later', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck.slice(0, 2)));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));
    for (let i = 0; i < 2; i++) answerRight();
    const answer = answerWrong();

    expect(within(screen.getByTestId('recall-feedback-wrong')).getByText(answer)).toBeInTheDocument();
    expect(screen.getByTestId('recall-progress')).toHaveTextContent('"mastered":0');
  });

  it('given the meet phase, when chips are peeked, then the counter tracks how many were opened', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);
    expect(screen.getByTestId('recall-peeked')).toHaveTextContent('"count":0,"total":4');
    fireEvent.click(within(screen.getByTestId('recall-meet')).getByRole('button', { name: /xylem/ }));
    fireEvent.click(within(screen.getByTestId('recall-meet')).getByRole('button', { name: /phloem/ }));
    fireEvent.click(within(screen.getByTestId('recall-meet')).getByRole('button', { name: /xylem/ }));
    expect(screen.getByTestId('recall-peeked')).toHaveTextContent('"count":2,"total":4');
  });

  it('given the quiz, then the answers are four tiles in four different colours', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));
    const fills = within(screen.getByTestId('recall-options')).getAllByRole('button').map((b) => b.className.match(/\bbg-neo-(pink|cyan|yellow|lime)\b/)?.[1]);
    expect(fills).toHaveLength(4);
    expect(new Set(fills).size).toBe(4);
  });

  it('given right answers in a row, then points float up, the score grows and the combo multiplier shows', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));
    expect(screen.getByTestId('recall-score')).toHaveTextContent('0');
    answerRight();
    expect(screen.getByTestId('recall-points-float')).toHaveTextContent(/\+\d+/);
    const first = Number(screen.getByTestId('recall-score').textContent!.replace(/\D/g, ''));
    expect(first).toBeGreaterThanOrEqual(100);
    expect(screen.queryByTestId('recall-multiplier')).not.toBeInTheDocument();
    answerRight();
    expect(screen.getByTestId('recall-multiplier')).toHaveTextContent('"count":2');
    expect(Number(screen.getByTestId('recall-score').textContent!.replace(/\D/g, ''))).toBeGreaterThanOrEqual(first + 200);
  });

  it('given a wrong answer, then it says the word comes back and the combo resets', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));
    answerRight();
    answerRight();
    answerWrong();
    expect(screen.getByTestId('recall-feedback-wrong')).toHaveTextContent('eduStudent.recall.wrongComeback');
    fireEvent.click(screen.getByTestId('recall-next'));
    expect(screen.queryByTestId('recall-multiplier')).not.toBeInTheDocument();
  });

  it('given a clean run, when it ends, then a celebration shows score, best combo and three stars, with confetti', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));
    for (let i = 0; i < 6; i++) answerRight();

    const finish = screen.getByTestId('recall-finish');
    expect(finish).toHaveAttribute('data-stars', '3');
    expect(finish).toHaveTextContent('eduStudent.recall.finishTitle_other:{"count":3}');
    expect(finish).toHaveTextContent('eduStudent.recall.bestCombo:{"count":6}');
    expect(confetti).toHaveBeenCalled();
    expect(screen.getByTestId('recall-practice-again')).toHaveTextContent('eduStudent.recall.beatScore');
  });

  it('given a second, sloppier run, when it ends, then the best score from the first run stays the one to beat', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));
    for (let i = 0; i < 6; i++) answerRight();
    const best = screen.getByTestId('recall-finish').getAttribute('data-score')!;

    fireEvent.click(screen.getByTestId('recall-practice-again'));
    let answered = 0;
    for (let i = 0; i < 60 && screen.queryByTestId('recall-quiz'); i++) {
      if (screen.queryByTestId('recall-next')) fireEvent.click(screen.getByTestId('recall-next'));
      else if (answered++ % 2 === 0) answerWrong();
      else answerRight();
    }
    const finish = screen.getByTestId('recall-finish');
    expect(Number(finish.getAttribute('data-score'))).toBeLessThan(Number(best));
    expect(Number(finish.getAttribute('data-stars'))).toBeLessThan(3);
    expect(screen.getByTestId('recall-practice-again')).toHaveTextContent(`"score":${best}`);
  });
});
