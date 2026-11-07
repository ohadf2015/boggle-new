import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthProvider';

const { fakeSocket, listeners, socketRef } = vi.hoisted(() => {
  const listeners = new Map<string, Set<(d?: unknown) => void>>();
  const fakeSocket = {
    emit: vi.fn(),
    on: (e: string, fn: (d?: unknown) => void) => {
      if (!listeners.has(e)) listeners.set(e, new Set());
      listeners.get(e)!.add(fn);
    },
    off: (e: string, fn: (d?: unknown) => void) => listeners.get(e)?.delete(fn),
  };
  return { listeners, fakeSocket, socketRef: { current: fakeSocket as typeof fakeSocket | null } };
});

vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => socketRef.current }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

import { ProjectorLobby } from '../ProjectorLobby';

const t = (key: string) => key;
const K = 'education.projectorLobby.lock';

function renderLobby() {
  render(
    <AuthProvider>
      <LanguageProvider>
        <ProjectorLobby gameCode="LOCK01" language="en" baseUrl="http://localhost:3000" students={[{ username: 'Ada' }]} t={t} onStartGame={vi.fn()} startLabelKey="hostView.startClassGame" />
      </LanguageProvider>
    </AuthProvider>
  );
}

const fromServer = (event: string, data: unknown) => act(() => listeners.get(event)?.forEach((fn) => fn(data)));
const toggle = () => screen.getByTestId('projector-lobby-lock');

describe('ProjectorLobby — room lock', () => {
  beforeEach(() => {
    sessionStorage.clear();
    listeners.clear();
    socketRef.current = fakeSocket;
    vi.clearAllMocks();
  });

  it('GIVEN a fresh lobby THEN the padlock reads "Lock room", unpressed, a 44px target, and asks the server for the stored state', () => {
    renderLobby();
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(toggle()).toHaveTextContent(`${K}.cta`);
    expect(toggle().className).toMatch(/min-h-11/);
    expect(fakeSocket.emit).toHaveBeenCalledWith('getClassroomLobbyLocked', { gameCode: 'LOCK01' });
  });

  it('GIVEN the teacher taps it THEN the lock is requested and the padlock flips only on the server ack', () => {
    renderLobby();
    fireEvent.click(toggle());
    expect(fakeSocket.emit).toHaveBeenCalledWith('setClassroomLobbyLocked', { gameCode: 'LOCK01', locked: true });
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(toggle()).toHaveAttribute('aria-busy', 'true');

    fromServer('classroomLobbyLockChanged', { gameCode: 'LOCK01', locked: true });
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(toggle()).toHaveTextContent(`${K}.locked`);
  });

  it('GIVEN it is locked WHEN tapped again THEN unlock is requested', () => {
    renderLobby();
    fromServer('classroomLobbyLockChanged', { gameCode: 'LOCK01', locked: true });
    fireEvent.click(toggle());
    expect(fakeSocket.emit).toHaveBeenCalledWith('setClassroomLobbyLocked', { gameCode: 'LOCK01', locked: false });
  });

  it('GIVEN another room\'s lock changes THEN this padlock ignores it', () => {
    renderLobby();
    fromServer('classroomLobbyLockChanged', { gameCode: 'OTHER1', locked: true });
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('GIVEN the lock write fails THEN the teacher sees why and the padlock is usable again', () => {
    renderLobby();
    fireEvent.click(toggle());
    fromServer('classroomGameError', { code: 'LOBBY_LOCK_FAILED', gameCode: 'LOCK01' });
    expect(screen.getByRole('alert')).toHaveTextContent(`${K}.failed`);
    expect(toggle()).not.toHaveAttribute('aria-busy', 'true');
  });

  it('GIVEN a different classroom error (a pressure dial) THEN the padlock does not react', () => {
    renderLobby();
    fireEvent.click(toggle());
    fromServer('classroomGameError', { error: 'education.classroomGame.pressureFailed' });
    expect(screen.queryByText(`${K}.failed`)).toBeNull();
    expect(toggle()).toHaveAttribute('aria-busy', 'true');
  });

  it('GIVEN the server rate-limits the tap THEN the padlock is usable again', () => {
    renderLobby();
    fireEvent.click(toggle());
    fromServer('rateLimited', undefined);
    expect(toggle()).not.toHaveAttribute('aria-busy', 'true');
  });

  it('GIVEN the ack never arrives THEN the padlock frees itself and re-reads the stored state', () => {
    vi.useFakeTimers();
    try {
      renderLobby();
      fireEvent.click(toggle());
      fakeSocket.emit.mockClear();
      act(() => vi.advanceTimersByTime(6000));
      expect(toggle()).not.toHaveAttribute('aria-busy', 'true');
      expect(fakeSocket.emit).toHaveBeenCalledWith('getClassroomLobbyLocked', { gameCode: 'LOCK01' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('GIVEN the projector socket reconnects THEN it re-reads the stored lock', () => {
    renderLobby();
    fakeSocket.emit.mockClear();
    fromServer('connect', undefined);
    expect(fakeSocket.emit).toHaveBeenCalledWith('getClassroomLobbyLocked', { gameCode: 'LOCK01' });
  });

  it('GIVEN no live socket (a design preview) THEN there is no padlock', () => {
    socketRef.current = null;
    renderLobby();
    expect(screen.queryByTestId('projector-lobby-lock')).toBeNull();
  });
});
