import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EduProjectorLobby from '@/components/education/live/EduProjectorLobby';

vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => null }));
vi.mock('@/components/education/lobby/LobbyModeSwitcher', () => ({ LobbyModeSwitcher: () => null }));
vi.mock('@/components/education/projector/ProjectorQuizBlocked', () => ({
  useQuizStartRefused: () => [false, vi.fn()],
  ProjectorQuizBlocked: () => null,
}));
vi.mock('@/components/education/projector/RehearsalBotsBlocked', () => ({ RehearsalBotsBlocked: () => null }));
vi.mock('@/components/education/lobby/useClassroomModeSwitch', () => ({ readLocalGameMode: () => null }));
vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => null }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} /> }));
const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => captureMock(...a) } }));

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

describe('EduProjectorLobby — try it on your own phone', () => {
  beforeEach(() => captureMock.mockClear());

  it('Given no real student yet, Then the teacher can open a test-student QR that marks the seat as a rehearsal', () => {
    render(<EduProjectorLobby {...base} />);
    expect(screen.queryByTestId('edu-phone-test-qr')).toBeNull();

    fireEvent.click(screen.getByTestId('edu-phone-test-open'));

    const qr = screen.getByTestId('edu-phone-test-qr').querySelector('[data-testid="qr"]');
    expect(qr).toHaveAttribute('data-value', 'https://www.lexiclash.live/en/join/AB12CD?rehearsal=1');
    expect(screen.getByTestId('edu-phone-test')).toHaveTextContent('eduLiveRoom.lobby.phoneTestHint');
    expect(captureMock).toHaveBeenCalledWith('edu_phone_test_opened', expect.objectContaining({ mode: 'classic' }));
  });

  it('Given only bots are seated, Then the phone test is still offered', () => {
    render(<EduProjectorLobby {...base} students={[{ username: 'Bot Ada', isBot: true }]} />);
    expect(screen.getByTestId('edu-phone-test-open')).toBeInTheDocument();
  });

  it('Given a real student joined, Then the phone test is gone so students never scan the test code', () => {
    render(<EduProjectorLobby {...base} students={[{ username: 'Noa' }]} />);
    expect(screen.queryByTestId('edu-phone-test-open')).toBeNull();
  });

  it('Given the test QR is open, When the teacher closes it, Then it hides again', () => {
    render(<EduProjectorLobby {...base} />);
    fireEvent.click(screen.getByTestId('edu-phone-test-open'));
    fireEvent.click(screen.getByTestId('edu-phone-test-open'));
    expect(screen.queryByTestId('edu-phone-test-qr')).toBeNull();
  });
});
