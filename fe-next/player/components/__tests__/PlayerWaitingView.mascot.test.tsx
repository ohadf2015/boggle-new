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
  useAuth: () => ({ isAuthenticated: false }),
}));

// Mock IdleMascot — what we're testing for
vi.mock('@/components/ui/IdleMascot', () => ({
  IdleMascot: ({ baseVariant, size }: { baseVariant?: string; size?: string }) => (
    <div data-testid="idle-mascot" data-variant={baseVariant} data-size={size}>Idle Mascot</div>
  ),
}));

describe('PlayerWaitingView IdleMascot', () => {
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
  // THEN IdleMascot(s) should be visible (renders in both mobile + desktop layouts)
  it('should render IdleMascot in the waiting view', () => {
    render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });

    const mascots = screen.getAllByTestId('idle-mascot');
    expect(mascots.length).toBeGreaterThanOrEqual(1);
  });

  // GIVEN the IdleMascot in the waiting view
  // WHEN it renders
  // THEN it should use 'waving' as the base variant (welcoming)
  it('should render IdleMascot with waving base variant', () => {
    render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });

    const mascots = screen.getAllByTestId('idle-mascot');
    expect(mascots[0]).toHaveAttribute('data-variant', 'waving');
  });

  // GIVEN the IdleMascot
  // WHEN it renders
  // THEN it should use size 'sm'
  it('should render IdleMascot with sm size', () => {
    render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });

    const mascots = screen.getAllByTestId('idle-mascot');
    expect(mascots[0]).toHaveAttribute('data-size', 'sm');
  });
});
