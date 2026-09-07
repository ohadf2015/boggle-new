/**
 * A student's lobby is not a party lobby.
 *
 * The classroom room reused the public multiplayer waiting view unchanged, so a
 * student who scanned their teacher's QR was handed the room's own recruiting
 * kit: the share code in the header, "Bring your squad" on desktop. Nothing in
 * a classroom wants that — the roster is the class, and the one person who
 * fills the room is the teacher, on the projector.
 *
 * The how-to-play panel was the same fault with sharper teeth: it fell back to
 * `classic` whenever the room's mode was unknown, which is exactly the state a
 * student sits in during a Vocab Quiz lobby. Teaching a student to trace words
 * on a grid, three seconds before a multiple-choice question appears, is worse
 * than teaching them nothing.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
/* eslint-disable react/display-name */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(({ children }: React.PropsWithChildren, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref}>{children}</div>
    )),
    button: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLButtonElement>) => (
      <button ref={ref} data-testid={props['data-testid'] as string}>{children}</button>
    )),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('../../../host/components/pre-game/MobileShareSection', () => ({
  MobileShareSection: () => <div data-testid="mobile-share-section" />,
}));
vi.mock('../../../host/components/pre-game/desktop', () => ({
  DesktopLobbyLayout: ({ leftContent, rightContent }: { leftContent: React.ReactNode; rightContent: React.ReactNode }) => (
    <div data-testid="desktop-layout">{leftContent}{rightContent}</div>
  ),
  InviteCard: () => <div data-testid="invite-card" />,
}));
vi.mock('../../../host/components/pre-game/GameInstructions', () => ({
  GameInstructions: ({ selectedGameMode }: { selectedGameMode: string }) => (
    <div data-testid="game-instructions" data-mode={selectedGameMode} />
  ),
}));
vi.mock('../../../components/RoomChat', () => ({ default: () => <div data-testid="room-chat" /> }));
vi.mock('../../../components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('../../../components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));
vi.mock('../../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }),
  useSocketOptional: () => ({ socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }),
}));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, updateProfile: vi.fn() }),
}));
vi.mock('@/hooks/gameState', () => ({
  useGameMode: () => 'classic',
  useHostSelectedGameMode: () => 'random',
}));
vi.mock('@/lib/animation/presets', () => ({
  SPRING_PRESETS: { balanced: { type: 'spring', stiffness: 300, damping: 26 } },
}));
vi.mock('@/utils/profileStorage', () => ({
  getOrCreateStoredCustomAvatar: () => null,
  setStoredCustomAvatar: vi.fn(),
}));
vi.mock('@/hooks/useAvatarPremium', () => ({ useAvatarPremium: () => ({ isPremium: false }) }));
vi.mock('@/components/avatar/AvatarBuilderModal', () => ({ __esModule: true, default: () => null }));

import PlayerWaitingView from '../PlayerWaitingView';

const defaultProps = {
  gameCode: 'JATS5Z',
  gameLanguage: 'en' as const,
  username: 'Maya',
  t: (key: string) => key,
  playersReady: [{ username: 'Maya', isHost: false }],
  showQR: false,
  setShowQR: vi.fn(),
  showExitConfirm: false,
  setShowExitConfirm: vi.fn(),
  onExitRoom: vi.fn(),
  onConfirmExit: vi.fn(),
};

describe('PlayerWaitingView — classroom students get no host controls', () => {
  beforeEach(() => vi.clearAllMocks());

  it('drops the share code and the invite card in a classroom room', () => {
    render(<PlayerWaitingView {...defaultProps} isClassroomMode />);
    expect(screen.queryByTestId('mobile-share-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invite-card')).not.toBeInTheDocument();
  });

  it('keeps both for an ordinary public room', () => {
    render(<PlayerWaitingView {...defaultProps} />);
    expect(screen.getAllByTestId('mobile-share-section').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('invite-card').length).toBeGreaterThanOrEqual(1);
  });

  it('teaches the classroom mode the teacher actually chose', () => {
    render(<PlayerWaitingView {...defaultProps} isClassroomMode classroomGameMode="word-hunt" />);
    const panels = screen.getAllByTestId('game-instructions');
    expect(panels.every((p) => p.getAttribute('data-mode') === 'word-hunt')).toBe(true);
  });

  it('teaches nothing rather than Classic in a Vocab Quiz lobby', () => {
    render(<PlayerWaitingView {...defaultProps} isClassroomMode classroomGameMode="vocab-quiz" />);
    expect(screen.queryByTestId('game-instructions')).not.toBeInTheDocument();
  });

  it('still falls back to the room mode outside classroom rooms', () => {
    render(<PlayerWaitingView {...defaultProps} />);
    expect(screen.getAllByTestId('game-instructions')[0].getAttribute('data-mode')).toBe('classic');
  });
});
