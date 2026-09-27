/**
 * JOIN must wait for the server to say yes.
 *
 * The critic watched two students tap "Join Game Now" and land on the bare
 * `/multiplayer` hub reading "No battles in progress", with no error at all.
 * The reason is an ordering bug, not a scoping one: `handleJoinGame` emitted
 * `joinClassroomGame` and navigated in the SAME tick, so the server's
 * `classroomGameError` ('Game not found', 'You are not a member of this
 * classroom', a server-unavailable code) could only ever arrive AFTER the
 * student had already been pushed somewhere else. The rejection then had
 * nowhere to render and vanished — recurring pitfall class 4, a failure that
 * looks exactly like the app losing the game they were just invited to.
 *
 * So: navigate on `joinedClassroomGame`, show the failure on
 * `classroomGameError`, and bound the wait so a server that answers with
 * nothing at all still ends in a message rather than a spinner.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPush = vi.fn();
const mockT = vi.fn((key: string) => key);

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));
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

const PROPS = { classroomId: 'flow-check', userId: 'user-1', username: 'Sam' };
const GAME = {
  gameCode: 'R438D5',
  classroomId: 'flow-check',
  teacherName: 'Ms Plant',
  lessonNames: ['Flow Check Words'],
};

/** A socket that records its listeners so the test can answer as the server. */
function makeSocket() {
  const listeners: Record<string, Array<(data: unknown) => void>> = {};
  return {
    emit: vi.fn(),
    on: vi.fn((event: string, fn: (data: unknown) => void) => {
      (listeners[event] ||= []).push(fn);
    }),
    off: vi.fn((event: string, fn: (data: unknown) => void) => {
      listeners[event] = (listeners[event] || []).filter((f) => f !== fn);
    }),
    server(event: string, data: unknown) {
      act(() => { (listeners[event] || []).forEach((f) => f(data)); });
    },
    listenerCount(event: string) {
      return (listeners[event] || []).length;
    },
  };
}

let socket: ReturnType<typeof makeSocket>;

function renderBanner() {
  mockUseActiveClassroomGame.mockReturnValue({
    activeGame: GAME, isConnected: true, socket, setActiveGame: vi.fn(), error: null,
  });
  return render(<ClassroomGameBanner {...PROPS} />);
}

describe('ClassroomGameBanner — JOIN waits for the server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    socket = makeSocket();
  });
  afterEach(() => vi.useRealTimers());

  it('does not navigate until the server confirms the join', () => {
    // GIVEN a live game on the banner
    renderBanner();

    // WHEN the student taps JOIN and the server has not answered yet
    fireEvent.click(screen.getByText('student.activeGame.joinNow'));

    // THEN the join is requested but nobody has been moved anywhere
    expect(socket.emit).toHaveBeenCalledWith('joinClassroomGame', {
      gameCode: 'R438D5', userId: 'user-1', username: 'Sam',
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates with the exact room code once the server confirms', () => {
    // GIVEN a student who has tapped JOIN
    renderBanner();
    fireEvent.click(screen.getByText('student.activeGame.joinNow'));

    // WHEN the server accepts them into the room
    socket.server('joinedClassroomGame', { success: true, gameCode: 'R438D5' });

    // THEN they go to that exact room, never the bare hub
    expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?room=R438D5&classroom=true');
  });

  it('ignores an error that belongs to the background poll, not to this join', () => {
    // GIVEN a student waiting on their join. The SAME socket carries
    // `useActiveClassroomGame`'s 15-second `getActiveClassroomGames` poll, and
    // that poll emits `classroomGameError` too — a Supabase hiccup gives
    // LOOKUP_UNAVAILABLE. Those errors carry no gameCode.
    renderBanner();
    fireEvent.click(screen.getByText('student.activeGame.joinNow'));

    // WHEN one lands inside the join window
    socket.server('classroomGameError', { error: 'education.errors.serverUnavailable' });

    // THEN it does not abort a join that is still perfectly alive
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // AND the real ack still finds its listener
    socket.server('joinedClassroomGame', { success: true, gameCode: 'R438D5' });
    expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?room=R438D5&classroom=true');
  });

  it('shows an error instead of navigating when the room is gone', () => {
    // GIVEN a student who has tapped JOIN on a game that has since ended
    renderBanner();
    fireEvent.click(screen.getByText('student.activeGame.joinNow'));

    // WHEN the server rejects THIS join — the rejection names the game it is
    // about, so the banner can tell it from unrelated socket traffic
    socket.server('classroomGameError', { error: 'Game not found', gameCode: 'R438D5' });

    // THEN they are told, and are NOT dumped on the generic multiplayer hub
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('student.activeGame.joinFailed');
  });

  it('lets the student try again after a failure', () => {
    // GIVEN a join that was rejected
    renderBanner();
    fireEvent.click(screen.getByText('student.activeGame.joinNow'));
    socket.server('classroomGameError', { error: 'Game not found', gameCode: 'R438D5' });

    // WHEN the student taps JOIN again
    fireEvent.click(screen.getByText('student.activeGame.joinNow'));

    // THEN the button was live again and the request really went out twice.
    // A dead end that can only be hit once is still a dead end.
    expect(socket.emit).toHaveBeenCalledTimes(2);
  });

  it('surfaces a message when the server never answers at all', () => {
    // GIVEN a student who tapped JOIN
    renderBanner();
    fireEvent.click(screen.getByText('student.activeGame.joinNow'));

    // WHEN the server says nothing — no ack, no error
    act(() => { vi.advanceTimersByTime(15_000); });

    // THEN the spinner does not run forever with no explanation
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('student.activeGame.joinFailed');
  });

  it('leaves no listeners behind after a join resolves', () => {
    // GIVEN a completed join
    renderBanner();
    fireEvent.click(screen.getByText('student.activeGame.joinNow'));
    socket.server('joinedClassroomGame', { success: true, gameCode: 'R438D5' });

    // THEN the one-shot listeners are removed. Left in place they stack up on
    // a shared socket and re-fire on the NEXT game's answer.
    expect(socket.listenerCount('joinedClassroomGame')).toBe(0);
    expect(socket.listenerCount('classroomGameError')).toBe(0);
  });
});
