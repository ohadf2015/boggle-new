/**
 * The screen every phone player hits before every game has to FIT, and every
 * control on it has to read as a control.
 *
 * A blind critic measured this exact surface at 390x844 and found the column
 * running to 1136px inside an 844px shell — the guest age-gate ("Tell us your
 * age to use chat") and its ADD MY AGE button sat nearly 300px below the fold,
 * clipped and untappable, because the lobby chat panel forces `min-h-[38vh]`
 * whatever room it is in. The same audit flagged the Exit button at 3.55:1:
 * it is icon-only, so the audit reads its accessible name against the button's
 * own inherited colour (white on `--neo-red` = 3.55) while the only colour
 * actually set — `text-neo-black` — lives on the svg.
 *
 * A classroom room does not want a chat panel at all. The roster is a class,
 * the teacher is in the room, and the one thing chat contributes to a student's
 * lobby is an age gate for a feature nobody asked for. Dropping it is what
 * makes the column fit; it is not a layout trick.
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
      <button ref={ref} data-testid={props['data-testid'] as string} className={props.className as string}>{children}</button>
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
vi.mock('../../../host/components/pre-game/LobbyAudioButton', () => ({
  LobbyAudioButton: () => <button data-testid="lobby-audio-button" aria-label="Mute" />,
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

/** Every class string rendered anywhere in this tree. */
function allClassNames(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>('*'))
    .map((el) => (typeof el.className === 'string' ? el.className : ''))
    .filter(Boolean);
}

describe('PlayerWaitingView — the classroom lobby fits a 390x844 phone', () => {
  beforeEach(() => vi.clearAllMocks());

  it('drops the chat panel (and its guest age gate) in a classroom room', () => {
    render(<PlayerWaitingView {...defaultProps} isClassroomMode classroomGameMode="vocab-quiz" />);
    expect(screen.queryByTestId('room-chat')).not.toBeInTheDocument();
  });

  it('keeps chat for an ordinary public room', () => {
    render(<PlayerWaitingView {...defaultProps} />);
    expect(screen.getAllByTestId('room-chat').length).toBeGreaterThanOrEqual(1);
  });

  it('forces no viewport-proportional minimum height in a classroom room', () => {
    const { container } = render(
      <PlayerWaitingView {...defaultProps} isClassroomMode classroomGameMode="vocab-quiz" />,
    );
    // `min-h-[38vh]` is 321px on a 844px phone — the single reason the column
    // ran past the fold. Nothing in this tree may pin a vh-proportional floor.
    expect(allClassNames(container).filter((c) => /min-h-\[\d+vh\]/.test(c))).toEqual([]);
  });

  it('fills the freed space with Lexi rather than a second scroll region', () => {
    render(<PlayerWaitingView {...defaultProps} isClassroomMode classroomGameMode="vocab-quiz" />);
    const art = screen.getAllByTestId('classroom-lobby-mascot')[0];
    // Decorative: the status line above already says what is happening, so the
    // art carries no text to translate and no name for a screen reader to read.
    expect(art).toHaveAttribute('alt', '');
    expect(art.getAttribute('src')).toContain('waiting-for-teacher');
  });

  it('keeps the ad slot out of a classroom lobby', () => {
    const { container } = render(
      <PlayerWaitingView {...defaultProps} isClassroomMode classroomGameMode="vocab-quiz" />,
    );
    expect(container.querySelector('[data-testid="lobby-ad-slot"]')).toBeNull();
  });
});

describe('PlayerWaitingView — icon-only controls still read as controls', () => {
  it('states the Exit button text colour on the button, not only on its icon', () => {
    render(<PlayerWaitingView {...defaultProps} isClassroomMode />);
    const exit = screen.getByLabelText('common.exit');
    // White on --neo-red is 3.55:1; black on it is 5.92:1. An audit reads the
    // BUTTON's colour against its own fill, so the class has to live here.
    expect(exit.className).toContain('text-neo-black');
  });

  it('gives the avatar button its own border width AND colour', () => {
    render(<PlayerWaitingView {...defaultProps} isClassroomMode />);
    const avatarBtn = screen.getAllByTestId('edit-avatar-button')[0];
    // Written as an arbitrary value on purpose: twMerge collapses `border-neo`
    // into the border-colour group and silently drops the width.
    expect(avatarBtn.className).toContain('border-[3px]');
    expect(avatarBtn.className).toContain('border-neo-lime');
  });

  it('gives the guest rename button a visible edge', () => {
    render(<PlayerWaitingView {...defaultProps} isClassroomMode />);
    const edit = screen.getAllByTestId('edit-name-button')[0];
    expect(edit.className).toContain('border-[2px]');
    expect(edit.className).toContain('border-neo-cream');
  });
});
