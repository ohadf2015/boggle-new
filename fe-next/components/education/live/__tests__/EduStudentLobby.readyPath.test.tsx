import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ loading: false, isAuthenticated: false, user: null, profile: null }) }));
vi.mock('@/hooks/useWinStreak', () => ({ useWinStreak: () => ({ currentStreak: 0 }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playTileSelectSound: vi.fn(), playStreakMilestoneSound: vi.fn() }) }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));

import EduStudentLobby, { STUDY_SKIP_AFTER_MS } from '@/components/education/live/EduStudentLobby';
import { useStudyDeck } from '@/lib/education/studyDeckStore';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

const base = {
  username: 'Maya',
  avatar: <span />,
  onEditAvatar: vi.fn(),
  nameSlot: <span>Maya</span>,
  readySlot: <button type="button" data-testid="ready-slot">ready</button>,
  emoteSlot: <span data-testid="emote-slot" />,
  quickPickSlot: <span data-testid="quick-pick" />,
  instructionsSlot: <span data-testid="how-to" />,
  classmates: [{ username: 'Maya' }, { username: 'Noa' }],
  onExit: vi.fn(),
  t,
};

const DECK = [
  { word: 'orbit', definition: 'A curved path' },
  { word: 'comet', definition: 'An icy ball' },
];

const seedDeck = () => act(() => useStudyDeck.getState().setDeck('ROOM1', DECK));

describe('EduStudentLobby ready path', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    act(() => useStudyDeck.getState().clear());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('given a student stuck on the words, when the wait passes, then they can skip to READY without being marked as having learned them', () => {
    seedDeck();
    render(<EduStudentLobby {...base} />);
    expect(screen.queryByTestId('study-skip')).toBeNull();

    act(() => { vi.advanceTimersByTime(STUDY_SKIP_AFTER_MS); });
    fireEvent.click(screen.getByTestId('study-skip'));

    expect(screen.getByTestId('ready-slot')).toBeInTheDocument();
    expect(screen.queryByTestId('study-ready-locked')).toBeNull();
    expect(useStudyDeck.getState().studied).toBe(false);
    expect(screen.getByTestId('lobby-word-study')).toBeInTheDocument();
  });

  it('given a skipped study step, when the quiz is still offered, then READY is the only lime action', () => {
    seedDeck();
    render(<EduStudentLobby {...base} />);
    expect(screen.getByTestId('recall-start').className).toContain('bg-neo-lime');
    act(() => { vi.advanceTimersByTime(STUDY_SKIP_AFTER_MS); });
    fireEvent.click(screen.getByTestId('study-skip'));
    expect(screen.getByTestId('recall-start').className).not.toContain('bg-neo-lime');
  });

  it('given a student already marked ready, when the word list arrives late, then READY is not taken away', () => {
    render(<EduStudentLobby {...base} isReady />);
    seedDeck();
    expect(screen.getByTestId('ready-slot')).toBeInTheDocument();
    expect(screen.queryByTestId('study-ready-locked')).toBeNull();
  });

  it('given a student still practising, then the bar shows only the locked READY line, not a second instruction', () => {
    seedDeck();
    render(<EduStudentLobby {...base} />);
    const footer = screen.getByTestId('edu-student-lobby-bar');
    expect(within(footer).queryByTestId('edu-student-waiting')).toBeNull();
    expect(within(footer).getByTestId('study-ready-locked')).toBeInTheDocument();
  });

  it.each([
    ['free to get ready', false, false, 'eduLiveRoom.student.waitReady'],
    ['already ready', false, true, 'academy.waiting.forTeacher'],
  ])('given a student %s, then the pinned bar says what they are waiting for', (_label, withDeck, isReady, key) => {
    if (withDeck) seedDeck();
    render(<EduStudentLobby {...base} isReady={isReady} />);
    const footer = screen.getByTestId('edu-student-lobby-bar');
    expect(within(footer).getByTestId('edu-student-waiting')).toHaveTextContent(key);
  });

  it('given no READY control in this room, then the student is never told to tap one', () => {
    render(<EduStudentLobby {...base} readySlot={undefined} />);
    expect(screen.getByTestId('edu-student-waiting')).toHaveTextContent('academy.waiting.forTeacher');
  });

  it('given the wait, then the pinned bar holds READY alone and looks, emotes, classmates and how-to sit in closed folds below practice', () => {
    render(<EduStudentLobby {...base} />);
    const footer = screen.getByTestId('edu-student-lobby-bar');
    expect(footer).toContainElement(screen.getByTestId('ready-slot'));
    expect(footer).not.toContainElement(screen.getByTestId('how-to'));

    const look = screen.getByTestId('edu-student-look');
    expect(look.tagName).toBe('DETAILS');
    expect(look).not.toHaveAttribute('open');
    expect(look).toContainElement(screen.getByTestId('quick-pick'));
    expect(look).toContainElement(screen.getByTestId('emote-slot'));

    const crowd = screen.getByTestId('edu-student-crowd');
    expect(crowd.tagName).toBe('DETAILS');
    expect(crowd).not.toHaveAttribute('open');
    expect(screen.getByTestId('edu-student-practice')).toContainElement(screen.getByTestId('waiting-warmup'));
    expect(screen.getByTestId('edu-student-practice').compareDocumentPosition(crowd) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('given a list, then the words are the practice and once learned the student keeps spelling them', () => {
    seedDeck();
    act(() => useStudyDeck.getState().markStudied());
    render(<EduStudentLobby {...base} />);
    const practice = screen.getByTestId('edu-student-practice');
    expect(practice).toContainElement(screen.getByTestId('lobby-word-study'));
    expect(within(practice).getByTestId('waiting-warmup')).toHaveAttribute('data-kind', 'spell');
  });
});
