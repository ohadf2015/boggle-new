import { vi, type Mock, } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PlayerWaitingView from '../PlayerWaitingView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
    li: ({ children, className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li className={className} {...props}>{children}</li>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar">Avatar</div>,
}));

vi.mock('../../../components/RoomChat', () => ({
  __esModule: true,
  default: () => <div data-testid="room-chat">Chat</div>,
}));

vi.mock('../../../host/components/pre-game/MobileShareSection', () => ({
  MobileShareSection: () => <div data-testid="mobile-share">Share</div>,
}));

vi.mock('../../../host/components/pre-game/desktop', () => ({
  DesktopLobbyLayout: ({ leftContent, rightContent }: { leftContent: React.ReactNode; rightContent: React.ReactNode }) => (
    <div data-testid="desktop-layout">{leftContent}{rightContent}</div>
  ),
  InviteCard: () => <div data-testid="invite-card">Invite</div>,
}));

vi.mock('../../../components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, updateProfile: vi.fn() }),
}));

// Mock gameState hooks
vi.mock('@/hooks/gameState', () => ({
  useGameMode: () => 'classic',
}));

// Mock RewardedAdGoldButton
vi.mock('@/components/ads/RewardedAdGoldButton', () => ({
  __esModule: true,
  default: () => <div data-testid="rewarded-ad" />,
}));

// Mock animation presets
vi.mock('@/lib/animation/presets', () => ({
  SPRING_PRESETS: { balanced: { type: 'spring', stiffness: 300, damping: 26 } },
}));

// Mock profileStorage
vi.mock('@/utils/profileStorage', () => ({
  getOrCreateStoredCustomAvatar: () => null,
  setStoredCustomAvatar: vi.fn(),
}));

// Mock useAvatarPremium
vi.mock('@/hooks/useAvatarPremium', () => ({
  useAvatarPremium: () => ({ isPremium: false }),
}));

// Mock AvatarBuilderModal
vi.mock('@/components/avatar/AvatarBuilderModal', () => ({
  __esModule: true,
  default: () => null,
}));

describe('PlayerWaitingView Hero Card', () => {
  const defaultProps = {
    gameCode: 'ABCD',
    gameLanguage: 'en' as const,
    username: 'Player1',
    t: (key: string) => key,
    playersReady: [{ username: 'Player1', isHost: false }],
    showQR: false,
    setShowQR: vi.fn(),
    showExitConfirm: false,
    setShowExitConfirm: vi.fn(),
    onExitRoom: vi.fn(),
    onConfirmExit: vi.fn(),
  };

  // GIVEN the player waiting view
  // WHEN it renders
  // THEN the hero card with avatar should be visible
  it('should render hero card with clickable avatar', () => {
    render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });

    const avatarButtons = screen.getAllByTestId('edit-avatar-button');
    expect(avatarButtons.length).toBeGreaterThanOrEqual(1);
  });

  // GIVEN the hero card
  // WHEN it renders
  // THEN the player name should be displayed prominently
  it('should display player name in hero card', () => {
    render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getAllByText('Player1').length).toBeGreaterThanOrEqual(1);
  });

  // GIVEN the hero card
  // WHEN it renders
  // THEN the waiting status should be visible
  it('should show waiting status', () => {
    render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getAllByTestId('waiting-status').length).toBeGreaterThanOrEqual(1);
  });
});
