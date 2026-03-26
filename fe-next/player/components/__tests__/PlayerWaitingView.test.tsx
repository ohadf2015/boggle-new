import { vi, type Mock, } from 'vitest';
/* eslint-disable react/display-name */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerWaitingView from '../PlayerWaitingView';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} {...filterDomProps(props)}>{children}</div>
    )),
    button: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLButtonElement>) => (
      <button ref={ref} {...filterDomProps(props)}>{children}</button>
    )),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

function filterDomProps(props: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'variants', 'layout'].includes(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

// Mock child components
vi.mock('../../../host/components/pre-game/MobileShareSection', () => ({
  MobileShareSection: () => <div data-testid="mobile-share-section" />,
}));
vi.mock('../../../host/components/pre-game/desktop', () => ({
  DesktopLobbyLayout: ({ leftContent, rightContent }: { leftContent: React.ReactNode; rightContent: React.ReactNode }) => (
    <div data-testid="desktop-layout">{leftContent}{rightContent}</div>
  ),
  InviteCard: () => <div data-testid="invite-card" />,
}));
vi.mock('../../../components/RoomChat', () => ({ default: () => <div data-testid="room-chat" /> }));
vi.mock('../../../components/Avatar', () => ({ default: ({ size }: { size: string }) => <div data-testid="avatar" data-size={size} /> }));
vi.mock('../../../components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

// Mock SocketContext
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};
vi.mock('../../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: mockSocket }),
}));

// Mock AuthContext
let mockIsAuthenticated = false;
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

const defaultProps = {
  gameCode: 'ABCD',
  gameLanguage: 'en' as const,
  username: 'TestPlayer',
  t: (key: string) => key,
  playersReady: [
    { username: 'TestPlayer', isHost: false },
    { username: 'Player2', isHost: false },
    { username: 'HostUser', isHost: true },
  ],
  showQR: false,
  setShowQR: vi.fn(),
  showExitConfirm: false,
  setShowExitConfirm: vi.fn(),
  onExitRoom: vi.fn(),
  onConfirmExit: vi.fn(),
};

describe('PlayerWaitingView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = false;
  });

  describe('Ready Button', () => {
    it('should not render ready button in lobby (ready only on results page)', () => {
      render(<PlayerWaitingView {...defaultProps} />);
      expect(screen.queryByTestId('ready-button')).not.toBeInTheDocument();
    });
  });

  describe('Guest Name Editing', () => {
    it('should show edit button for guest users', () => {
      mockIsAuthenticated = false;
      render(<PlayerWaitingView {...defaultProps} />);
      const editButtons = screen.getAllByTestId('edit-name-button');
      expect(editButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should NOT show edit button for authenticated users', () => {
      mockIsAuthenticated = true;
      render(<PlayerWaitingView {...defaultProps} />);
      expect(screen.queryByTestId('edit-name-button')).not.toBeInTheDocument();
    });

    it('should show name input when edit button is clicked', () => {
      mockIsAuthenticated = false;
      render(<PlayerWaitingView {...defaultProps} />);
      const editButtons = screen.getAllByTestId('edit-name-button');
      fireEvent.click(editButtons[0]);
      const inputs = screen.getAllByTestId('name-edit-input');
      expect(inputs.length).toBeGreaterThanOrEqual(1);
    });

    it('should call onNameChange when name is submitted', () => {
      mockIsAuthenticated = false;
      const onNameChange = vi.fn();
      render(<PlayerWaitingView {...defaultProps} onNameChange={onNameChange} />);
      const editButtons = screen.getAllByTestId('edit-name-button');
      fireEvent.click(editButtons[0]);
      const inputs = screen.getAllByTestId('name-edit-input');
      fireEvent.change(inputs[0], { target: { value: 'NewName' } });
      const saveButtons = screen.getAllByTestId('name-save-button');
      fireEvent.click(saveButtons[0]);
      expect(onNameChange).toHaveBeenCalledWith('NewName');
    });
  });

  describe('Existing Functionality', () => {
    it('should not render room code in header (removed)', () => {
      render(<PlayerWaitingView {...defaultProps} />);
      expect(screen.queryByTestId('room-code')).not.toBeInTheDocument();
    });

    it('should render player names in roster', () => {
      render(<PlayerWaitingView {...defaultProps} />);
      // Player names appear multiple times (desktop + mobile), use getAllByText
      const testPlayerElements = screen.getAllByText('TestPlayer');
      expect(testPlayerElements.length).toBeGreaterThanOrEqual(1);
      const player2Elements = screen.getAllByText('Player2');
      expect(player2Elements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
