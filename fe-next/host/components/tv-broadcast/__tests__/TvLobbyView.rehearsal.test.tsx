import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { writeRehearseIntent } from '@/lib/education/rehearsal';

const trackMock = vi.fn();
vi.mock('@/lib/education/rehearsalTelemetry', () => ({
  trackEduRehearsalStarted: (...args: unknown[]) => trackMock(...args),
}));
vi.mock('@/components/education/projector/ProjectorLobby', () => ({
  default: ({ onStartPracticeRound }: { onStartPracticeRound?: () => void }) => (
    <button type="button" data-testid="practice" onClick={onStartPracticeRound}>practice</button>
  ),
}));
vi.mock('@/components/education/live/eduLiveSurfaces', () => ({ useEduLiveSurfaces: () => ({}) }));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));
vi.mock('@/hooks/gameState/store', () => ({ useHostSelectedGameMode: () => 'classic' }));
vi.mock('@/hooks/gameState', () => ({ useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => ({ socket: null }), getSharedSocketIfExists: () => null }));
vi.mock('@/hooks/useLobbyAutoStart', () => ({ useLobbyAutoStart: () => ({ secondsLeft: null, cancel: vi.fn() }) }));
vi.mock('../../../hooks/useClassroomModeSeed', () => ({ useClassroomModeSeed: () => undefined }));

import TvLobbyView from '../TvLobbyView';

const host = { username: 'Teacher', isHost: true };
const bots = [{ username: 'Bot Ada', isBot: true }, { username: 'Bot Lin', isBot: true }];
const base = {
  gameCode: 'AB12CD',
  roomLanguage: 'en' as const,
  username: 'Teacher',
  t: (key: string) => key,
  timerValue: 120,
  difficulty: 'medium' as const,
  onStartGame: vi.fn(),
  onExitRoom: vi.fn(),
  tournamentCreating: false,
  isClassroomMode: true,
  classroomGameMode: 'classic' as const,
};

describe('TvLobbyView — classroom rehearsal', () => {
  beforeEach(() => {
    sessionStorage.clear();
    trackMock.mockReset();
  });

  it('Given the teacher tapped Rehearse on HQ, When the host is seated, Then bots are requested without another tap', () => {
    writeRehearseIntent({ source: 'hq', classExists: false });
    const solo = vi.fn(() => vi.fn());
    const { rerender } = render(<TvLobbyView {...base} playersReady={[]} onStartSoloDemoWithBots={solo} />);
    expect(solo).not.toHaveBeenCalled();
    rerender(<TvLobbyView {...base} playersReady={[host]} onStartSoloDemoWithBots={solo} />);
    expect(solo).toHaveBeenCalledTimes(1);
  });

  it('Given an HQ rehearsal, When the bots are seated and the round starts, Then it is counted as an HQ rehearsal', async () => {
    writeRehearseIntent({ source: 'hq', classExists: false });
    const begin = vi.fn();
    const solo = vi.fn(() => begin);
    const { rerender } = render(<TvLobbyView {...base} playersReady={[host]} onStartSoloDemoWithBots={solo} />);
    rerender(<TvLobbyView {...base} playersReady={[host, ...bots]} onStartSoloDemoWithBots={solo} />);
    await waitFor(() => expect(begin).toHaveBeenCalledTimes(1));
    expect(trackMock).toHaveBeenCalledWith({ source: 'hq', mode: 'classic', classExists: false });
  });

  it('Given a tap in the lobby, When the round starts, Then it is counted as a lobby rehearsal', async () => {
    const begin = vi.fn();
    const solo = vi.fn(() => begin);
    const { rerender } = render(<TvLobbyView {...base} playersReady={[host]} onStartSoloDemoWithBots={solo} />);
    fireEvent.click(screen.getByTestId('practice'));
    rerender(<TvLobbyView {...base} playersReady={[host, ...bots]} onStartSoloDemoWithBots={solo} />);
    await waitFor(() => expect(begin).toHaveBeenCalledTimes(1));
    expect(trackMock).toHaveBeenCalledWith({ source: 'lobby', mode: 'classic', classExists: true });
  });

  it('Given the bots never arrive, Then no rehearsal is counted', () => {
    const solo = vi.fn(() => vi.fn());
    render(<TvLobbyView {...base} playersReady={[host]} onStartSoloDemoWithBots={solo} />);
    fireEvent.click(screen.getByTestId('practice'));
    expect(trackMock).not.toHaveBeenCalled();
  });
});
