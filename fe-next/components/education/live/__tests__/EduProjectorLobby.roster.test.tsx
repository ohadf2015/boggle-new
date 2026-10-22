import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const socket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };

vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({
  useLiveClassroomGameInfo: () => ({ classroomName: 'Room 4B', gameMode: 'classic', settings: { timerMinutes: 3 } }),
}));
vi.mock('@/components/education/lobby/LobbyModeSwitcher', () => ({ LobbyModeSwitcher: () => <span /> }));
vi.mock('@/components/education/projector/ProjectorQuizBlocked', () => ({
  useQuizStartRefused: () => [false, vi.fn()],
  ProjectorQuizBlocked: () => null,
}));
vi.mock('@/components/education/lobby/useClassroomModeSwitch', () => ({ readLocalGameMode: () => null }));
vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => socket }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: () => <svg /> }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) =>
    open ? <button type="button" data-testid="remove-confirm-ok" onClick={onConfirm} /> : null,
}));

import EduProjectorLobby from '@/components/education/live/EduProjectorLobby';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

const base = {
  gameCode: 'AB12CD',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  t,
  onStartGame: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
  classroomGameMode: 'classic' as const,
};

describe('EduProjectorLobby roster control', () => {
  beforeEach(() => vi.clearAllMocks());

  it('given students joined, when Start is ready, then the button carries how many students it will start with', () => {
    render(<EduProjectorLobby {...base} students={[{ username: 'Noa' }, { username: 'Ido' }, { username: 'Lia' }]} />);
    expect(screen.getByTestId('edu-lobby-start-count')).toHaveTextContent('3');
  });

  it('given an empty room, when Start is locked, then no count badge pretends there is a class', () => {
    render(<EduProjectorLobby {...base} students={[]} />);
    expect(screen.queryByTestId('edu-lobby-start-count')).not.toBeInTheDocument();
  });

  it('given the teacher removes a student from the lobby, when confirmed, then the host kick goes to the server for that name', () => {
    render(<EduProjectorLobby {...base} students={[{ username: 'Noa' }, { username: 'Troll99' }]} />);
    fireEvent.click(screen.getByTestId('edu-lobby-edit-roster'));
    fireEvent.click(screen.getAllByTestId('edu-lobby-remove')[1]);
    fireEvent.click(screen.getByTestId('remove-confirm-ok'));
    expect(socket.emit).toHaveBeenCalledWith('kickPlayer', { targetUsername: 'Troll99' });
  });
});
