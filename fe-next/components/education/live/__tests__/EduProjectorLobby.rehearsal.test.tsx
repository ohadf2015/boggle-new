import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EduProjectorLobby from '@/components/education/live/EduProjectorLobby';

vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => null }));
vi.mock('@/components/education/lobby/LobbyModeSwitcher', () => ({ LobbyModeSwitcher: () => null }));
vi.mock('@/components/education/projector/ProjectorQuizBlocked', () => ({
  useQuizStartRefused: () => [false, vi.fn()],
  ProjectorQuizBlocked: () => null,
}));
vi.mock('@/components/education/projector/RehearsalBotsBlocked', () => ({
  RehearsalBotsBlocked: () => <div data-testid="rehearsal-bots-blocked" />,
}));
vi.mock('@/components/education/lobby/useClassroomModeSwitch', () => ({ readLocalGameMode: () => null }));
vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => null }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: () => <svg /> }));

const t = (key: string) => key;
const base = {
  gameCode: 'AB12CD',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  students: [] as { username: string; isBot?: boolean }[],
  t,
  onStartGame: vi.fn(),
  onStartPracticeRound: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
  classroomGameMode: 'classic' as const,
};
const bots = [
  { username: 'Bot Ada', isBot: true },
  { username: 'Bot Lin', isBot: true },
];

describe('EduProjectorLobby — rehearsing before the class arrives', () => {
  it('Given an empty room, Then practice is the solid primary action and is labeled private', () => {
    render(<EduProjectorLobby {...base} />);
    expect(screen.getByTestId('edu-lobby-practice').className).toMatch(/bg-neo-lime/);
    expect(screen.getByTestId('rehearsal-private-note')).toHaveTextContent('education.projectorLobby.rehearsePrivate');
  });

  it('Given only bots are seated, Then practice stays and Start waits for a real student', () => {
    render(<EduProjectorLobby {...base} students={bots} />);
    expect(screen.getByTestId('edu-lobby-practice')).toBeEnabled();
    expect(screen.getByTestId('edu-lobby-start')).toBeDisabled();
  });

  it('Given a real student joined, Then practice is gone and Start is live', () => {
    render(<EduProjectorLobby {...base} students={[...bots, { username: 'Noa' }]} />);
    expect(screen.queryByTestId('edu-lobby-practice')).toBeNull();
    expect(screen.getByTestId('edu-lobby-start')).toBeEnabled();
  });

  it('Given a mode bots cannot play, Then the lobby offers a bot-capable mode instead of a dead practice', () => {
    render(<EduProjectorLobby {...base} classroomGameMode="wordcraft" />);
    expect(screen.queryByTestId('edu-lobby-practice')).toBeNull();
    expect(screen.getByTestId('rehearsal-bots-blocked')).toBeInTheDocument();
  });
});
