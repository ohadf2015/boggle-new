import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ loading: false, isAuthenticated: false, user: null, profile: null }) }));
vi.mock('@/hooks/useWinStreak', () => ({ useWinStreak: () => ({ currentStreak: 0 }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playTileSelectSound: vi.fn(), playStreakMilestoneSound: vi.fn() }) }));
const confetti = vi.hoisted(() => vi.fn());
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: confetti }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));

import EduStudentLobby from '@/components/education/live/EduStudentLobby';
import { useStudyDeck } from '@/lib/education/studyDeckStore';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

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

const deck = [{ word: 'xylem' }, { word: 'phloem' }, { word: 'stomata', hint: 'leaf pores' }];

const tiles = () => within(screen.getByTestId('recall-spell-tiles')).getAllByRole('button').filter((b) => b.dataset.used === 'false');
const target = () => screen.getByTestId('recall-build-word').textContent!;
const build = () => {
  for (const letter of target().toUpperCase()) fireEvent.click(tiles().find((b) => b.dataset.letter === letter)!);
};
const fumble = () => {
  const first = target()[0].toUpperCase();
  fireEvent.click(tiles().find((b) => b.dataset.letter !== first)!);
  fireEvent.click(tiles().find((b) => b.dataset.letter !== first)!);
};
const score = () => Number(screen.getByTestId('recall-score').textContent!.replace(/\D/g, ''));

describe('EduStudentLobby word builder for lists without meanings', () => {
  beforeEach(() => {
    sessionStorage.clear();
    confetti.mockClear();
    act(() => useStudyDeck.getState().clear());
  });

  it('given words without meanings, when the lobby opens, then the words show as cards with a build button and READY waits', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);
    const meet = screen.getByTestId('recall-meet');
    for (const card of deck) expect(within(meet).getByText(card.word)).toBeInTheDocument();
    expect(screen.getByTestId('recall-start')).toHaveTextContent('eduStudent.recall.buildStart');
    expect(screen.queryByTestId('study-word')).not.toBeInTheDocument();
    expect(screen.getByTestId('study-ready-locked')).toHaveTextContent('eduStudent.lobby.studyReadyLocked');
  });

  it('given the build game, when each word is built in a row, then points and the combo grow and READY unlocks with a celebration', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));

    expect(screen.getByTestId('recall-build')).toBeInTheDocument();
    expect(score()).toBe(0);
    build();
    expect(score()).toBeGreaterThanOrEqual(100);
    expect(screen.queryByTestId('ready-slot')).not.toBeInTheDocument();
    build();
    expect(screen.getByTestId('recall-multiplier')).toHaveTextContent('"count":2');
    build();

    expect(screen.getByTestId('ready-slot')).toBeInTheDocument();
    expect(useStudyDeck.getState().studied).toBe(true);
    const finish = screen.getByTestId('recall-finish');
    expect(finish).toHaveAttribute('data-stars', '3');
    expect(finish).toHaveTextContent('eduStudent.recall.finishTitle_other:{"count":3}');
    expect(confetti).toHaveBeenCalled();
    expect(screen.getByTestId('recall-practice-again')).toHaveTextContent('eduStudent.recall.beatScore');
  });

  it('given a fumbled word, when two tiles are wrong, then it says the word comes back and it must still be built', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', deck.slice(0, 2)));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));
    const missed = target();
    fumble();

    expect(screen.getByTestId('recall-build-retry')).toHaveTextContent('eduStudent.recall.wrongComeback');
    expect(screen.getByTestId('recall-progress')).toHaveTextContent('"mastered":0,"total":2');
    build();
    expect(target()).toBe(missed);
    build();
    expect(screen.getByTestId('ready-slot')).toBeInTheDocument();
    expect(Number(screen.getByTestId('recall-finish').getAttribute('data-stars'))).toBeLessThan(3);
  });

  it('given a word with a hint, when it is up, then the hint shows on the card', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', [{ word: 'stomata', hint: 'leaf pores' }]));
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('recall-start'));
    expect(screen.getByTestId('recall-build')).toHaveTextContent('leaf pores');
  });

  it('given only words too short or long to build, when the lobby opens, then the flip-through cards stay', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', [{ word: 'ox' }, { word: 'go' }]));
    render(<EduStudentLobby {...base} />);
    expect(screen.getByTestId('study-word')).toHaveTextContent('ox');
    expect(screen.queryByTestId('recall-meet')).not.toBeInTheDocument();
  });
});
