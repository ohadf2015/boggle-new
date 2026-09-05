/**
 * ClassroomGameBanner — the first thing a class of thirty looks at.
 *
 * P0: the banner opened its OWN Socket.IO connection with no auth token, so the
 * server rejected `getActiveClassroomGames` before ever subscribing it to
 * `classroom:<id>`. It could never show a game. Meanwhile the extracted
 * `useActiveClassroomGame` hook — rendered on the same page, three lines below —
 * did send the token. One student screen carried a working live-game button
 * under a permanently dead "listening" strip. The banner must consume the hook.
 *
 * P1: dismissing the banner set a boolean and nulled the game. Fifteen seconds
 * later the poll re-set the game while `dismissed` was still true, and the
 * dismissed branch returned `null` — the whole strip vanished, leaving dead
 * space where the class's live game had been. Dismissal is now per gameCode and
 * falls back to the listening strip, never to nothing.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPush = vi.fn();
const mockT = vi.fn((key: string) => key);

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));

// The banner must NOT open a socket of its own. If it ever does again, this
// throws and the first test fails loudly rather than silently regressing.
vi.mock('socket.io-client', () => ({
  io: () => { throw new Error('ClassroomGameBanner opened its own socket — use useActiveClassroomGame'); },
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
  return {
    m: { div: MockDiv, header: MockDiv },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { ClassroomGameBanner } from '../ClassroomGameBanner';

const PROPS = { classroomId: 'class-1', userId: 'user-1', username: 'Maya' };
const GAME = { gameCode: 'ABC123', teacherName: 'Ms Plant', lessonNames: ['Unit 3'] };

const mockSocket = { emit: vi.fn() };

function mockHook(overrides: Record<string, unknown> = {}) {
  mockUseActiveClassroomGame.mockReturnValue({
    activeGame: null,
    isConnected: true,
    socket: mockSocket,
    setActiveGame: vi.fn(),
    error: null,
    ...overrides,
  });
}

describe('ClassroomGameBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHook();
  });

  it('gets its live game from the shared authenticated hook, not its own socket', () => {
    // GIVEN a classroom
    // WHEN the banner renders
    render(<ClassroomGameBanner {...PROPS} />);

    // THEN it subscribes through the hook (which sends the access token)
    expect(mockUseActiveClassroomGame).toHaveBeenCalledWith('class-1');
  });

  it('shows the JOIN banner when the class is playing', () => {
    // GIVEN the teacher has started a game
    mockHook({ activeGame: GAME });

    // WHEN the student's hub renders
    render(<ClassroomGameBanner {...PROPS} />);

    // THEN the join affordance is there
    expect(screen.getByText('student.activeGame.joinNow')).toBeInTheDocument();
  });

  it('falls back to the listening strip after dismiss instead of blanking', () => {
    // GIVEN a live game the student dismisses
    mockHook({ activeGame: GAME });
    const { rerender } = render(<ClassroomGameBanner {...PROPS} />);
    fireEvent.click(screen.getByLabelText('common.close'));

    // WHEN the 15s poll re-delivers the SAME still-running game
    mockHook({ activeGame: GAME });
    rerender(<ClassroomGameBanner {...PROPS} />);

    // THEN the strip is still there — quiet, not gone
    expect(screen.queryByText('student.activeGame.joinNow')).not.toBeInTheDocument();
    expect(screen.getByText('student.activeGame.listening')).toBeInTheDocument();
  });

  it('shows a NEW game after an earlier one was dismissed', () => {
    // GIVEN the student dismissed one game
    mockHook({ activeGame: GAME });
    const { rerender } = render(<ClassroomGameBanner {...PROPS} />);
    fireEvent.click(screen.getByLabelText('common.close'));

    // WHEN the teacher starts a different round
    mockHook({ activeGame: { ...GAME, gameCode: 'XYZ789' } });
    rerender(<ClassroomGameBanner {...PROPS} />);

    // THEN dismissal does not carry over to it
    expect(screen.getByText('student.activeGame.joinNow')).toBeInTheDocument();
  });
});
