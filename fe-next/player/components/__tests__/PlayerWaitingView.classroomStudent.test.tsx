import { vi, describe, it, expect, beforeEach } from 'vitest';
/* eslint-disable react/display-name */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
// The real LobbyAudioButton needs Music/SFX/Language providers; the waiting-view
// suites render without them. The audio-control hand-off itself is covered by
// LobbyAudioButton.test.tsx + NavigationContext.headerAudioControl.test.tsx.
vi.mock('../../../host/components/pre-game/LobbyAudioButton', () => ({
  LobbyAudioButton: () => <button data-testid="lobby-audio-button" aria-label="Mute" />,
}));
vi.mock('../../../components/RoomChat', () => ({ default: () => <div data-testid="room-chat" /> }));
vi.mock('../../../components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('../../../components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  AlertDialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div data-testid="exit-dialog" className={className}>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));
vi.mock('../../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }),
  useSocketOptional: () => ({ socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }),
}));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, updateProfile: vi.fn(async () => ({})) }),
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


describe('PlayerWaitingView - the classroom student waiting room', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers one-tap looks under the avatar', () => {
    render(<PlayerWaitingView {...defaultProps} isClassroomMode />);
    expect(screen.getByTestId('avatar-quick-pick')).toBeInTheDocument();
  });

  it('When a look is tapped, Then it rides the same save path as the builder (socket + storage)', () => {
    const onAvatarChange = vi.fn();
    render(<PlayerWaitingView {...defaultProps} isClassroomMode onAvatarChange={onAvatarChange} />);
    fireEvent.click(screen.getAllByTestId('avatar-quick-option')[0]);
    expect(onAvatarChange).toHaveBeenCalledTimes(1);
  });

  it('Given the student is ready, Then the stage shows it on their face', () => {
    render(<PlayerWaitingView {...defaultProps} isClassroomMode isReady onToggleReady={vi.fn()} />);
    expect(screen.getByTestId('waiting-ready-sticker')).toBeInTheDocument();
  });

  it('asks before leaving on the dark host surface, not the cream one', () => {
    render(<PlayerWaitingView {...defaultProps} isClassroomMode showExitConfirm />);
    const dialog = screen.getByTestId('exit-dialog');
    expect(dialog.className).toContain('bg-neo-navy-light');
    expect(dialog.className).not.toContain('bg-neo-cream');
    expect(screen.getByText('eduStudent.exit.title')).toBeInTheDocument();
  });

  it('keeps the public lobby exit dialog as it was', () => {
    render(<PlayerWaitingView {...defaultProps} showExitConfirm />);
    expect(screen.getByText('playerView.exitConfirmation')).toBeInTheDocument();
  });
});
