import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectorModeCard } from '../ProjectorModeCard';
import type { useProjectorLobbyMode } from '../useProjectorLobbyMode';

vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => null }));

const lobby = {
  modeId: 'classic',
  mode: 'classic',
  isQuiz: false,
  switched: false,
  quizBlocked: false,
  facts: [{ key: 'timer', text: '3 min' }],
  className: 'Room 7',
  lessonNames: [],
  roundSettings: {},
  applyMode: vi.fn(),
} as unknown as ReturnType<typeof useProjectorLobbyMode>;

const t = (key: string) => key;

describe('ProjectorModeCard', () => {
  it('Given no round played yet, Then the mode is a read-only echo of the lobby pick', () => {
    render(<ProjectorModeCard gameCode="ABC123" lobby={lobby} t={t} canChange={false} />);
    expect(screen.getByTestId('projector-mode')).toHaveTextContent('teacher.classroom.gameModes.classic');
    expect(screen.queryByTestId('lobby-change-mode')).toBeNull();
  });

  it('Given a round was played ("Next game"), Then the change control is offered', () => {
    render(<ProjectorModeCard gameCode="ABC123" lobby={lobby} t={t} canChange />);
    expect(screen.getByTestId('lobby-change-mode')).toBeInTheDocument();
  });
});
