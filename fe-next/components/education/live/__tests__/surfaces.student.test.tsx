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

vi.mock('@/host/components/pre-game/MobileShareSection', () => ({
  MobileShareSection: () => <div data-testid="mobile-share-section" />,
}));
vi.mock('@/host/components/pre-game/desktop', () => ({
  DesktopLobbyLayout: ({ leftContent, rightContent }: { leftContent: React.ReactNode; rightContent: React.ReactNode }) => (
    <div data-testid="desktop-layout">{leftContent}{rightContent}</div>
  ),
  InviteCard: () => <div data-testid="invite-card" />,
}));
vi.mock('@/host/components/pre-game/GameInstructions', () => ({
  GameInstructions: ({ selectedGameMode }: { selectedGameMode: string }) => (
    <div data-testid="game-instructions" data-mode={selectedGameMode} />
  ),
}));
// The real LobbyAudioButton needs Music/SFX/Language providers; the waiting-view
// suites render without them. The audio-control hand-off itself is covered by
// LobbyAudioButton.test.tsx + NavigationContext.headerAudioControl.test.tsx.
vi.mock('@/host/components/pre-game/LobbyAudioButton', () => ({
  LobbyAudioButton: () => <button data-testid="lobby-audio-button" aria-label="Mute" />,
}));
vi.mock('@/components/RoomChat', () => ({ default: () => <div data-testid="room-chat" /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));
vi.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({ socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }),
  useSocketOptional: () => ({ socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }),
}));
vi.mock('@/contexts/AuthContext', () => ({
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

import PlayerWaitingView from '@/player/components/PlayerWaitingView';
import { EduLiveSurfacesProvider } from '@/components/education/live/eduLiveSurfaces';
import type { ClassroomWaitingStageProps } from '@/components/education/lobby/ClassroomWaitingStage';

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

function Override(props: ClassroomWaitingStageProps) {
  return (
    <div data-testid="edu-student-lobby" data-name={props.username}>
      {props.readySlot}
    </div>
  );
}

describe('edu live surfaces — student lobby', () => {
  it('given the edu live provider, when a classroom student waits, then the edu lobby renders with the ready control', () => {
    render(
      <EduLiveSurfacesProvider value={{ StudentLobby: Override }}>
        <PlayerWaitingView {...defaultProps} isClassroomMode onToggleReady={vi.fn()} />
      </EduLiveSurfacesProvider>,
    );
    expect(screen.getByTestId('edu-student-lobby')).toHaveAttribute('data-name', 'Maya');
    expect(screen.queryByTestId('classroom-waiting-count')).not.toBeInTheDocument();
  });

  it('given no provider, when a classroom student waits, then the same edu student lobby renders', () => {
    render(<PlayerWaitingView {...defaultProps} isClassroomMode />);
    expect(screen.getByTestId('edu-student-count')).toBeInTheDocument();
  });
});
