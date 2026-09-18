/**
 * Classroom Live Lobby — the screen where students join before the game starts
 *
 * Teachers see: giant join code, QR code, roster updating live, ONE Start button
 * Students see: join code to enter
 * Layout: 1920x1080 projector-safe, no scroll, dark-only surface
 * Animation: roster pops in as students join, count ticks up
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import type { Socket } from 'socket.io-client';

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: vi.fn(), success: vi.fn() },
}));

const { stableT } = vi.hoisted(() => ({
  stableT: (key: string, params?: unknown) =>
    params && typeof params === 'object' ? `${key}|${JSON.stringify(params)}` : key,
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: stableT, language: 'en' }),
}));

const { stableRouter } = vi.hoisted(() => ({ stableRouter: { push: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => stableRouter }));

import { ClassroomLiveLobby } from '../ClassroomLiveLobby';

const mockSocket = {
  emit: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
} as unknown as Socket;

describe('ClassroomLiveLobby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders exactly one Start button', async () => {
    render(
      <ClassroomLiveLobby
        gameCode="XJXEFN"
        socket={mockSocket}
        onStart={() => {}}
      />
    );

    const startButtons = screen.getAllByTestId('classroom-lobby-start');
    expect(startButtons).toHaveLength(1);
  });

  it('displays the join code prominently', async () => {
    render(
      <ClassroomLiveLobby
        gameCode="XJXEFN"
        socket={mockSocket}
        onStart={() => {}}
      />
    );

    expect(screen.getByText('XJXEFN')).toBeInTheDocument();
    expect(screen.getByTestId('classroom-lobby-code')).toBeInTheDocument();
  });

  it('renders roster from socket updateUsers event', async () => {
    const { rerender } = render(
      <ClassroomLiveLobby
        gameCode="XJXEFN"
        socket={mockSocket}
        onStart={() => {}}
      />
    );

    // Simulate socket updateUsers event with students
    const updateUsersCallback = (mockSocket.on as any).mock.calls.find(
      (call: any[]) => call[0] === 'updateUsers'
    )?.[1];

    expect(updateUsersCallback).toBeDefined();
    updateUsersCallback?.([
      { username: 'Alice', score: 0, avatar: { type: 'emoji', emoji: '🦁' } },
      { username: 'Bob', score: 0, avatar: { type: 'emoji', emoji: '🐯' } },
    ]);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('filters out the host from the displayed roster', async () => {
    render(
      <ClassroomLiveLobby
        gameCode="XJXEFN"
        socket={mockSocket}
        onStart={() => {}}
      />
    );

    const updateUsersCallback = (mockSocket.on as any).mock.calls.find(
      (call: any[]) => call[0] === 'updateUsers'
    )?.[1];

    updateUsersCallback?.([
      { username: 'Alice', score: 0, isHost: false },
      { username: 'Teacher', score: 0, isHost: true },
      { username: 'Bob', score: 0, isHost: false },
    ]);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.queryByText('Teacher')).not.toBeInTheDocument();
    });
  });

  it('displays a count of joined students', async () => {
    render(
      <ClassroomLiveLobby
        gameCode="XJXEFN"
        socket={mockSocket}
        onStart={() => {}}
      />
    );

    const updateUsersCallback = (mockSocket.on as any).mock.calls.find(
      (call: any[]) => call[0] === 'updateUsers'
    )?.[1];

    updateUsersCallback?.([
      { username: 'Alice', score: 0, isHost: false },
      { username: 'Bob', score: 0, isHost: false },
      { username: 'Charlie', score: 0, isHost: false },
    ]);

    await waitFor(() => {
      const counter = screen.getByTestId('classroom-lobby-count');
      expect(counter).toHaveTextContent('3');
    });
  });

  it('has no scroll container and fits in 1920x1080', async () => {
    render(
      <ClassroomLiveLobby
        gameCode="XJXEFN"
        socket={mockSocket}
        onStart={() => {}}
      />
    );

    const root = screen.getByTestId('classroom-lobby-root');
    expect(root).toHaveClass('h-dvh');
    expect(root).toHaveClass('overflow-hidden');
  });

  it('calls onStart when the Start button is clicked', async () => {
    const onStart = vi.fn();
    render(
      <ClassroomLiveLobby
        gameCode="XJXEFN"
        socket={mockSocket}
        onStart={onStart}
      />
    );

    fireEvent.click(screen.getByTestId('classroom-lobby-start'));
    expect(onStart).toHaveBeenCalled();
  });
});
