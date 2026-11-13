import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: { div: 'div', span: 'span', p: 'p', button: 'button', li: 'li', ul: 'ul' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));
let liveInfo: { studyWordCount?: number } | null = null;
vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => liveInfo }));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));

import ProjectorLobby from '../ProjectorLobby';
import { markRoomPlayed } from '../roomPlayed';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const props = {
  gameCode: 'GHYRVS',
  language: 'en',
  students: [{ username: 'Ada' }, { username: 'Ben' }],
  t,
  onStartGame: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
  wordCount: 6,
};

describe('ProjectorLobby — the match waits for students to learn the words', () => {
  it('Given lesson words and a student still studying, Then Start becomes a quiet Start anyway with the count', () => {
    render(<ProjectorLobby {...props} readyUsernames={['Ada']} />);
    const start = screen.getByTestId('projector-start');
    expect(start).toHaveTextContent('education.projectorLobby.startAnyway');
    expect(start).not.toBeDisabled();
    expect(start.className).not.toMatch(/edu-live-unlock/);
    expect(screen.getByTestId('projector-still-learning')).toHaveTextContent('education.projectorLobby.stillLearning:{"count":1}');
  });

  it('Given Start anyway is pressed, Then the round still starts', () => {
    const onStartGame = vi.fn();
    render(<ProjectorLobby {...props} readyUsernames={[]} onStartGame={onStartGame} />);
    fireEvent.click(screen.getByTestId('projector-start'));
    expect(onStartGame).toHaveBeenCalledTimes(1);
  });

  it('Given the class already played a round, When nobody has re-tapped READY, Then Start is the full primary, not Start anyway', () => {
    markRoomPlayed(props.gameCode);
    try {
      render(<ProjectorLobby {...props} readyUsernames={[]} />);
      expect(screen.getByTestId('projector-start')).toHaveTextContent('hostView.startClassGame');
      expect(screen.queryByTestId('projector-still-learning')).toBeNull();
    } finally {
      sessionStorage.clear();
    }
  });

  it('Given everyone is ready, Then Start is the full primary again', () => {
    render(<ProjectorLobby {...props} readyUsernames={['Ada', 'Ben']} />);
    expect(screen.getByTestId('projector-start')).toHaveTextContent('hostView.startClassGame');
    expect(screen.queryByTestId('projector-still-learning')).toBeNull();
  });

  it('Given the teacher reloaded the wall and lost the launch word count, Then the room record still holds Start for learners', () => {
    liveInfo = { studyWordCount: 6 };
    render(<ProjectorLobby {...props} wordCount={undefined} readyUsernames={['Ada']} />);
    expect(screen.getByTestId('projector-still-learning')).toBeInTheDocument();
    liveInfo = null;
  });

  it('Given no lesson words, Then READY stays advisory as before', () => {
    render(<ProjectorLobby {...props} wordCount={0} readyUsernames={[]} />);
    expect(screen.getByTestId('projector-start')).toHaveTextContent('hostView.startClassGame');
    expect(screen.queryByTestId('projector-still-learning')).toBeNull();
  });
});
