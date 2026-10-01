import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: { div: 'div', span: 'span', p: 'p', button: 'button', li: 'li', ul: 'ul' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));
vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => null }));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));

import ProjectorLobby from '../ProjectorLobby';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const baseProps = {
  gameCode: 'GHYRVS',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  students: [] as { username: string }[],
  t,
  onStartGame: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
};

describe('ProjectorLobby — one bottom bar, one START', () => {
  it('Given an empty room, Then START itself says what it is waiting for, and no separate warning banner is painted', () => {
    render(<ProjectorLobby {...baseProps} />);
    const start = screen.getByTestId('projector-start');
    expect(start).toBeDisabled();
    expect(start).toHaveTextContent('eduHq.lobby.waitingOne');
    expect(start).not.toHaveTextContent('hostView.startClassGame');
    expect(screen.getByTestId('projector-start-reason').className).toMatch(/(^|\s)sr-only(\s|$)/);
  });

  it('Given one student, Then START reads the start label again', () => {
    render(<ProjectorLobby {...baseProps} students={[{ username: 'Ada' }]} />);
    const start = screen.getByTestId('projector-start');
    expect(start).not.toBeDisabled();
    expect(start).toHaveTextContent('hostView.startClassGame');
    expect(start).not.toHaveTextContent('eduHq.lobby.waitingOne');
  });

  it('Given starting, Then the creating label wins over the waiting one', () => {
    render(<ProjectorLobby {...baseProps} starting />);
    expect(screen.getByTestId('projector-start')).toHaveTextContent('hostView.creatingTournament');
  });

  it('Given an empty room with bots available, Then practice is a quiet text link, not a second big button', () => {
    const onPractice = vi.fn();
    render(<ProjectorLobby {...baseProps} onStartPracticeRound={onPractice} />);
    const link = screen.getByTestId('projector-practice-round');
    expect(link).toHaveTextContent('eduHq.lobby.practiceLink');
    expect(link.className).toMatch(/(^|\s)underline(\s|$)/);
    expect(link.className).not.toMatch(/(^|\s)(border-3|w-full|shadow-hard-sm|uppercase)(\s|$)/);
    fireEvent.click(link);
    expect(onPractice).toHaveBeenCalledTimes(1);
  });

  it('Given the footer, Then it is the sticky bottom bar holding START as its only filled control', () => {
    render(<ProjectorLobby {...baseProps} students={[{ username: 'Ada' }]} />);
    const bar = screen.getByTestId('projector-start-bar');
    expect(bar).toContainElement(screen.getByTestId('projector-start'));
    expect(bar.className).toMatch(/(^|\s)shrink-0(\s|$)/);
  });
});
