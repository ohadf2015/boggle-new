import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: { div: 'div', span: 'span', p: 'p', button: 'button', li: 'li', ul: 'ul' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));
vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => null }));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));

import ProjectorLobby from '../ProjectorLobby';

const t = (key: string) => key;
const props = {
  gameCode: 'GHYRVS',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  students: [] as { username: string }[],
  t,
  onStartGame: vi.fn(),
  onStartPracticeRound: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
};

describe('ProjectorLobby — an empty room has one clear primary', () => {
  it('Given nobody joined, Then Start itself says it is waiting for students', () => {
    render(<ProjectorLobby {...props} />);
    const start = screen.getByTestId('projector-start');
    expect(start).toBeDisabled();
    expect(start).toHaveTextContent('eduLive.lobby.waitingForStudents');
    expect(start).not.toHaveTextContent('hostView.startClassGame');
  });

  it('Given nobody joined, Then the reason is a quiet caption, not a competing pink pill', () => {
    render(<ProjectorLobby {...props} />);
    const reason = screen.getByTestId('projector-start-reason');
    expect(reason.className).not.toMatch(/border-neo-pink|bg-neo-pink/);
  });

  it('Given nobody joined, Then practicing with bots is the one solid action and says it is private', () => {
    render(<ProjectorLobby {...props} />);
    const practice = screen.getByTestId('projector-practice-round');
    expect(practice).toHaveTextContent('education.projectorLobby.rehearseCta');
    expect(practice.className).toMatch(/bg-neo-lime/);
    expect(practice.className).not.toContain('underline');
    expect(screen.getByText('education.projectorLobby.rehearsePrivate')).toBeInTheDocument();
  });

  it('Given a student joined, Then the practice action is gone', () => {
    render(<ProjectorLobby {...props} students={[{ username: 'Ada' }]} />);
    expect(screen.queryByTestId('projector-practice-round')).toBeNull();
  });

  it('Given a student joined, Then Start reads as Start again', () => {
    render(<ProjectorLobby {...props} students={[{ username: 'Ada' }]} />);
    expect(screen.getByTestId('projector-start')).toHaveTextContent('hostView.startClassGame');
  });
});
