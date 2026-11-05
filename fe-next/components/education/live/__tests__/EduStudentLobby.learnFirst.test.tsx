import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ loading: false, isAuthenticated: false, user: null, profile: null }) }));
vi.mock('@/hooks/useWinStreak', () => ({ useWinStreak: () => ({ currentStreak: 0 }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playTileSelectSound: vi.fn(), playStreakMilestoneSound: vi.fn() }) }));
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

describe('EduStudentLobby learn-the-words-first', () => {
  beforeEach(() => {
    sessionStorage.clear();
    act(() => useStudyDeck.getState().clear());
  });

  it('keeps the old lobby when the game has no lesson words', () => {
    render(<EduStudentLobby {...base} />);
    expect(screen.queryByTestId('lobby-word-study')).not.toBeInTheDocument();
    expect(screen.getByTestId('ready-slot')).toBeInTheDocument();
  });

  it('shows the words one at a time and holds READY until every card is seen', () => {
    act(() => useStudyDeck.getState().setDeck('ROOM1', [{ word: 'xylem', definition: 'Carries water' }, { word: 'stomata' }]));
    render(<EduStudentLobby {...base} />);

    expect(screen.getByTestId('study-word')).toHaveTextContent('xylem');
    expect(screen.getByText('Carries water')).toBeInTheDocument();
    expect(screen.queryByTestId('ready-slot')).not.toBeInTheDocument();
    expect(screen.getByTestId('study-ready-locked')).toBeInTheDocument();
    expect(screen.getByTestId('study-back')).toBeDisabled();

    fireEvent.click(screen.getByTestId('study-next'));
    expect(screen.getByTestId('study-word')).toHaveTextContent('stomata');
    fireEvent.click(screen.getByTestId('study-done'));

    expect(screen.getByTestId('ready-slot')).toBeInTheDocument();
    expect(screen.queryByTestId('study-ready-locked')).not.toBeInTheDocument();
    expect(useStudyDeck.getState().studied).toBe(true);
  });

  it('lets a student who already studied this room ready up straight away', () => {
    act(() => {
      useStudyDeck.getState().setDeck('ROOM1', [{ word: 'sun' }]);
      useStudyDeck.getState().markStudied();
    });
    render(<EduStudentLobby {...base} />);
    expect(screen.getByTestId('ready-slot')).toBeInTheDocument();
    expect(screen.getByTestId('lobby-word-study')).toBeInTheDocument();
  });
});
