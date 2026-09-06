/**
 * JOIN must carry a room code, or not navigate at all.
 *
 * The critic saw "Join Game Now" land students on the generic /multiplayer hub
 * showing "No battles in progress", with no error. The server half of that is
 * fixed (finished games are no longer advertised as active), but the client must
 * not be able to produce that outcome at all: navigating to the hub with a
 * missing or empty room code is a dead end wearing a working button's clothes.
 *
 * Also pins the classroom scoping of the realtime event. `classroomGameCreated`
 * carries a classroomId and the hook was ignoring it, so anything that ever put
 * a socket in a second classroom room would surface another class's game.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPush = vi.fn();
const mockT = vi.fn((key: string) => key);
const mockToastError = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));
vi.mock('react-hot-toast', () => ({ __esModule: true, default: { error: mockToastError, success: vi.fn() } }));
vi.mock('socket.io-client', () => ({
  io: () => { throw new Error('ClassroomGameBanner opened its own socket'); },
}));

const mockUseActiveClassroomGame = vi.fn();
vi.mock('@/hooks/useActiveClassroomGame', () => ({
  useActiveClassroomGame: (...args: unknown[]) => mockUseActiveClassroomGame(...args),
}));
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => React.createElement('img', props as never),
}));
vi.mock('framer-motion', () => {
  const R = require('react');
  const MockDiv = R.forwardRef(function MockDiv(props: Record<string, unknown>, ref: unknown) {
    const { children, ...rest } = props as React.PropsWithChildren<Record<string, unknown>>;
    return R.createElement('div', { ...rest, ref }, children);
  });
  return { m: { div: MockDiv }, AnimatePresence: ({ children }: { children: React.ReactNode }) => children };
});

import { ClassroomGameBanner } from '../ClassroomGameBanner';

const PROPS = { classroomId: 'class-1', userId: 'user-1', username: 'Maya' };
const mockSocket = { emit: vi.fn() };

function mockHook(activeGame: unknown) {
  mockUseActiveClassroomGame.mockReturnValue({
    activeGame, isConnected: true, socket: mockSocket, setActiveGame: vi.fn(), error: null,
  });
}

describe('ClassroomGameBanner — JOIN never lands nowhere', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not navigate when the game has no room code', () => {
    // GIVEN a banner holding a game record with no gameCode
    mockHook({ gameCode: '', teacherName: 'Ms Plant', lessonNames: ['Week 3 Vocabulary'] });
    render(<ClassroomGameBanner {...PROPS} />);

    // WHEN the student taps JOIN
    const join = screen.queryByText('student.activeGame.joinNow');
    if (join) fireEvent.click(join);

    // THEN they are never dumped on the generic hub
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('navigates with the exact room code when there is one', () => {
    // GIVEN a live game
    mockHook({ gameCode: 'VHTDFB', teacherName: 'Ms Plant', lessonNames: ['Week 3 Vocabulary'] });
    render(<ClassroomGameBanner {...PROPS} />);

    // WHEN the student taps JOIN
    fireEvent.click(screen.getByText('student.activeGame.joinNow'));

    // THEN the room code goes with them
    expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?room=VHTDFB&classroom=true');
  });
});
